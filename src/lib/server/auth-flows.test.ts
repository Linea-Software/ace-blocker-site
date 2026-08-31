import { describe, it, expect, vi, beforeEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { handleUserCreatedAfter } from './auth-hooks';

// Auth flow tests (spec §5.2 / release plan Step 5.2): signup → verification
// email → signin → password reset → 2FA.
//
// These are integration-style: a Better Auth instance is built in-memory with
// the memory adapter and the SAME option blocks the site uses (emailAndPassword
// with requireEmailVerification, emailVerification.sendVerificationEmail,
// twoFactor OTP, databaseHooks.user.create.after welcome hook). The email
// sender is the seam: verification/reset/OTP mail is captured by spies wired
// into the config, and the welcome email goes through the real site hook into
// the mocked $lib/server/email module. Requests are driven through the real
// auth.handler() HTTP surface with a cookie jar, exactly like a browser.

// The real auth.ts module (imported below for config assertions) needs env.
vi.hoisted(() => {
	process.env.DODO_PAYMENTS_WEBHOOK_SECRET = Buffer.from(
		'webhook-test-secret-0123456789'
	).toString('base64');
	process.env.DODO_PAYMENTS_API_KEY = 'sk_test_0000000000000000';
	process.env.BETTER_AUTH_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
});

// The real auth.ts binds to the drizzle adapter; swap it for the in-memory
// adapter so the REAL site config (sendResetPassword, hooks, plugins) can be
// exercised without a Postgres.
vi.mock('better-auth/adapters/drizzle', async () => {
	const { memoryAdapter } = await import('better-auth/adapters/memory');
	return {
		drizzleAdapter: () =>
			memoryAdapter({
				user: [],
				session: [],
				account: [],
				verification: [],
				apikey: [],
				twoFactor: []
			})
	};
});

// The real auth.ts creates a DodoPayments client and (createCustomerOnSignUp)
// calls the Dodo API on signup; the SDK is the seam — no network in tests.
vi.mock('dodopayments', () => ({
	default: class DodoPaymentsMock {
		customers = {
			list: vi.fn().mockResolvedValue({ items: [] }),
			create: vi.fn().mockResolvedValue({ customer_id: 'cus_test_1' }),
			update: vi.fn().mockResolvedValue({ customer_id: 'cus_test_1' })
		};
		subscriptions = { list: vi.fn().mockResolvedValue({ items: [] }), update: vi.fn() };
		licenses = { validate: vi.fn() };
		checkoutSessions = { create: vi.fn() };
	}
}));

const { verificationEmail, resetPasswordEmail, otpEmail, resendSend } = vi.hoisted(() => ({
	verificationEmail: vi.fn(),
	resetPasswordEmail: vi.fn(),
	otpEmail: vi.fn(),
	resendSend: vi.fn().mockResolvedValue({ data: { id: 'test' } })
}));

// pino-pretty spawns a transport worker with piped stdio in dev; stubbing the
// logger keeps the test process from hanging on open handles at teardown.
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		child: () => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			fatal: vi.fn()
		})
	})
}));

// The welcome email goes through the real site hook (auth-hooks.ts) into the
// mocked email sender. resend.emails.send is also the real auth.ts password
// reset sender, so it is observable here.
vi.mock('$lib/server/email', () => ({
	resend: { emails: { send: resendSend } },
	getLocaleForEmail: vi.fn().mockResolvedValue('en'),
	sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
	sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
	sendSubscriptionExpiringEmail: vi.fn().mockResolvedValue(undefined),
	sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
	sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
	getTwoFactorEmailHtml: vi.fn(() => 'html'),
	getVerificationEmailHtml: vi.fn(() => 'html'),
	getEmailOtpHtml: vi.fn(() => 'html'),
	getResetPasswordEmailHtml: vi.fn(() => 'html')
}));

// The real auth.ts module and the Elysia routers read the db at module scope;
// the mock keeps them importable without a DATABASE_URL (the flows use the
// in-memory adapter; the webhook/pro paths only import the module).
vi.mock('$lib/server/db', () => ({
	db: {
		query: { user: { findFirst: vi.fn() }, session: { findFirst: vi.fn() } },
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn().mockResolvedValue(undefined),
	clearProExpiration: vi.fn().mockResolvedValue(undefined),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(false),
	getProStatus: vi.fn().mockResolvedValue({ isPro: false, expirationDate: null })
}));

import { sendWelcomeEmail } from './email';
import { auth as siteAuth } from './auth';

const BASE_URL = 'http://localhost';

/** Build a fresh in-memory Better Auth instance mirroring the site config. */
function makeAuth() {
	return betterAuth({
		baseURL: BASE_URL,
		secret: 'test-secret-0123456789abcdef0123456789abcdef',
		// The memory adapter stores one array per model table.
		database: memoryAdapter({
			user: [],
			session: [],
			account: [],
			verification: [],
			apikey: [],
			twoFactor: []
		}),
		user: {
			additionalFields: {
				locale: { type: 'string', required: false, defaultValue: 'en', input: false }
			}
		},
		emailAndPassword: {
			enabled: true,
			requireEmailVerification: true,
			// Spec: password reset flow — the site must be able to send the
			// reset email (sendResetPassword is the email-sender seam).
			sendResetPassword: async (data) => {
				resetPasswordEmail(data);
			}
		},
		databaseHooks: {
			user: {
				create: {
					// The real site hook — welcome email for signups only.
					after: handleUserCreatedAfter
				}
			}
		},
		emailVerification: {
			sendVerificationEmail: async (data) => {
				verificationEmail(data);
			},
			autoSignInAfterVerification: true
		},
		plugins: [
			twoFactor({
				issuer: 'Ace Blocker',
				skipVerificationOnEnable: true,
				otpOptions: {
					sendOTP: async (data) => {
						otpEmail(data);
					}
				}
			})
		]
	});
}

class CookieJar {
	private cookies = new Map<string, string>();

	capture(res: Response): void {
		for (const setCookie of res.headers.getSetCookie()) {
			const [pair] = setCookie.split(';');
			const separator = pair.indexOf('=');
			if (separator <= 0) continue;
			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1);
			this.cookies.set(name, value);
		}
	}

	header(): string {
		return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ');
	}
}

async function post(auth: ReturnType<typeof makeAuth>, path: string, body: unknown, jar: CookieJar) {
	const res = await auth.handler(
		new Request(`${BASE_URL}${path}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(jar.header() ? { cookie: jar.header() } : {})
			},
			body: JSON.stringify(body)
		})
	);
	jar.capture(res);
	return res;
}

function tokenFromUrl(url: string, pathPrefix: string): string {
	const parsed = new URL(url);
	// Verification URLs carry the token as a query parameter.
	const queryToken = parsed.searchParams.get('token');
	if (queryToken) return queryToken;
	// Reset URLs carry it as the last path segment: /reset-password/TOKEN.
	const segments = parsed.pathname.split('/').filter(Boolean);
	const idx = segments.indexOf(pathPrefix);
	if (idx === -1 || !segments[idx + 1]) throw new Error(`no token in url: ${url}`);
	return decodeURIComponent(segments[idx + 1]);
}

describe('auth flows (in-memory Better Auth with the site config)', () => {
	let auth: ReturnType<typeof makeAuth>;
	const email = 'flow@example.com';
	const password = 'correct-horse-battery-staple';

	beforeEach(() => {
		vi.clearAllMocks();
		auth = makeAuth();
	});

	it('signup sends a verification email and the welcome email', async () => {
		const jar = new CookieJar();
		const res = await post(auth, '/api/auth/sign-up/email', { name: 'Flow User', email, password }, jar);
		expect(res.status).toBe(200);

		// Verification email fired for the new user.
		expect(verificationEmail).toHaveBeenCalledOnce();
		const verificationCall = verificationEmail.mock.calls[0][0] as {
			user: { email: string };
			url: string;
		};
		expect(verificationCall.user.email).toBe(email);
		expect(verificationCall.url).toContain('/api/auth/verify-email');

		// Welcome email fired via databaseHooks.user.create.after (real hook).
		expect(sendWelcomeEmail).toHaveBeenCalledOnce();
		expect(sendWelcomeEmail).toHaveBeenCalledWith(email, 'en');
	});

	it('signin is rejected until the email is verified', async () => {
		await post(auth, '/api/auth/sign-up/email', { name: 'Flow User', email, password }, new CookieJar());

		const jar = new CookieJar();
		const res = await post(auth, '/api/auth/sign-in/email', { email, password }, jar);
		expect(res.status).toBe(403); // EMAIL_NOT_VERIFIED
	});

	it('signin works after verifying the email (auto sign-in on verify)', async () => {
		await post(auth, '/api/auth/sign-up/email', { name: 'Flow User', email, password }, new CookieJar());
		const verificationCall = verificationEmail.mock.calls[0][0] as { url: string };
		const token = tokenFromUrl(verificationCall.url, 'verify-email');

		const verifyRes = await auth.handler(
			new Request(`${BASE_URL}/api/auth/verify-email?token=${token}&callbackURL=${BASE_URL}/`)
		);
		expect(verifyRes.status).toBe(302); // redirects after verification

		const jar = new CookieJar();
		const res = await post(auth, '/api/auth/sign-in/email', { email, password }, jar);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { user: { email: string } };
		expect(body.user.email).toBe(email);
	});

	it('password reset: request sends a reset email, reset sets a new password', async () => {
		// Verify the user first so sign-in is possible afterwards.
		await post(auth, '/api/auth/sign-up/email', { name: 'Flow User', email, password }, new CookieJar());
		const verificationCall = verificationEmail.mock.calls[0][0] as { url: string };
		await auth.handler(
			new Request(`${BASE_URL}/api/auth/verify-email?token=${tokenFromUrl(verificationCall.url, 'verify-email')}&callbackURL=${BASE_URL}/`)
		);

		const jar = new CookieJar();
		const requestRes = await post(
			auth,
			'/api/auth/request-password-reset',
			{ email, redirectTo: `${BASE_URL}/signin` },
			jar
		);
		expect(requestRes.status).toBe(200);
		expect(resetPasswordEmail).toHaveBeenCalledOnce();

		const resetCall = resetPasswordEmail.mock.calls[0][0] as {
			user: { email: string };
			url: string;
		};
		expect(resetCall.user.email).toBe(email);
		const resetToken = tokenFromUrl(resetCall.url, 'reset-password');

		const newPassword = 'brand-new-password-456';
		const resetRes = await post(
			auth,
			'/api/auth/reset-password',
			{ newPassword, token: resetToken },
			jar
		);
		expect(resetRes.status).toBe(200);

		// The old password no longer works, the new one does.
		const oldJar = new CookieJar();
		expect((await post(auth, '/api/auth/sign-in/email', { email, password }, oldJar)).status).toBe(401);
		const newJar = new CookieJar();
		const signInRes = await post(auth, '/api/auth/sign-in/email', { email, password: newPassword }, newJar);
		expect(signInRes.status).toBe(200);
	});

	it('2FA: enable OTP, sign-in challenges, OTP email verifies the session', async () => {
		// Verified signup → session cookie.
		const jar = new CookieJar();
		await post(auth, '/api/auth/sign-up/email', { name: 'Flow User', email, password }, jar);
		const verificationCall = verificationEmail.mock.calls[0][0] as { url: string };
		await auth.handler(
			new Request(`${BASE_URL}/api/auth/verify-email?token=${tokenFromUrl(verificationCall.url, 'verify-email')}&callbackURL=${BASE_URL}/`)
		);
		await post(auth, '/api/auth/sign-in/email', { email, password }, jar);

		// Enroll: enable OTP 2FA with the current password (the site's plugin
		// configures otpOptions, so the client sends method: 'otp').
		const enableRes = await post(auth, '/api/auth/two-factor/enable', { password, method: 'otp' }, jar);
		expect(enableRes.status).toBe(200);
		expect(((await enableRes.json()) as { method: string }).method).toBe('otp');

		// Sign out, then sign in → 2FA challenge.
		await post(auth, '/api/auth/sign-out', {}, jar);
		const challengeJar = new CookieJar();
		const signInRes = await post(auth, '/api/auth/sign-in/email', { email, password }, challengeJar);
		expect(signInRes.status).toBe(200);
		expect(((await signInRes.json()) as { twoFactorRedirect?: boolean }).twoFactorRedirect).toBe(true);

		// Request the OTP — it must be emailed.
		const otpRequest = await post(auth, '/api/auth/two-factor/send-otp', {}, challengeJar);
		expect(otpRequest.status).toBe(200);
		expect(otpEmail).toHaveBeenCalledOnce();
		const otp = (otpEmail.mock.calls[0][0] as { otp: string }).otp;
		expect(otp).toMatch(/^\d{6}$/);

		// Verify the OTP → full session granted.
		const verifyRes = await post(auth, '/api/auth/two-factor/verify-otp', { code: otp }, challengeJar);
		expect(verifyRes.status).toBe(200);
		const verified = (await verifyRes.json()) as { token: string; user: { email: string } };
		expect(verified.user.email).toBe(email);
		expect(verified.token).toBeTruthy();

		// The session cookie now authenticates.
		const sessionRes = await auth.handler(
			new Request(`${BASE_URL}/api/auth/get-session`, {
				headers: { cookie: challengeJar.header() }
			})
		);
		expect(sessionRes.status).toBe(200);
		const sessionBody = (await sessionRes.json()) as { user: { email: string } };
		expect(sessionBody.user.email).toBe(email);
	});
});

describe('welcome email gating (databaseHooks.user.create.after)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('sends the welcome email for a real signup (context present)', async () => {
		await handleUserCreatedAfter({ email: 'signup@example.com', locale: 'en' }, { request: {} });
		expect(sendWelcomeEmail).toHaveBeenCalledExactlyOnceWith('signup@example.com', 'en');
	});

	it('does NOT send the welcome email for seeder-created users (context null)', async () => {
		// The seeder calls auth.api.createUser without a request → context is
		// null → no welcome email (auth.ts documents this contract).
		await handleUserCreatedAfter({ email: 'pro@example.com' }, null);
		expect(sendWelcomeEmail).not.toHaveBeenCalled();
	});

	it('uses the user locale when present', async () => {
		await handleUserCreatedAfter({ email: 'it@example.com', locale: 'it' }, { request: {} });
		expect(sendWelcomeEmail).toHaveBeenCalledExactlyOnceWith('it@example.com', 'it');
	});

	it('swallows email-sender failures so signup never breaks', async () => {
		vi.mocked(sendWelcomeEmail).mockRejectedValueOnce(new Error('resend down'));
		await expect(
			handleUserCreatedAfter({ email: 'signup@example.com' }, { request: {} })
		).resolves.toBeUndefined();
	});
});

describe('site auth config (real auth.ts, in-memory adapter)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('signup fires the verification + welcome emails through the real config', async () => {
		const email = 'real-config@example.com';
		const res = await siteAuth.handler(
			new Request('http://localhost/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: 'Real Config User',
					email,
					password: 'correct-horse-battery-staple'
				})
			})
		);
		expect(res.status).toBe(200);

		// sendVerificationEmail (auth.ts) went through resend.
		const verificationSend = resendSend.mock.calls.find(
			(call) => (call[0] as { subject: string }).subject === 'Verify your email'
		);
		expect(verificationSend).toBeDefined();
		expect((verificationSend![0] as { to: string }).to).toBe(email);

		// databaseHooks.user.create.after (auth.ts) sent the welcome email.
		expect(sendWelcomeEmail).toHaveBeenCalledWith(email, 'en');
	});

	it('password reset is wired: requestPasswordReset sends the reset email', async () => {
		const email = 'real-reset@example.com';
		await siteAuth.handler(
			new Request('http://localhost/api/auth/sign-up/email', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: 'Real Reset User',
					email,
					password: 'correct-horse-battery-staple'
				})
			})
		);

		const res = await siteAuth.handler(
			new Request('http://localhost/api/auth/request-password-reset', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, redirectTo: 'http://localhost/signin' })
			})
		);
		expect(res.status).toBe(200);

		const resetSend = resendSend.mock.calls.find(
			(call) => (call[0] as { subject: string }).subject === 'Reset your password'
		);
		expect(resetSend).toBeDefined();
		expect((resetSend![0] as { to: string }).to).toBe(email);
	});
});
