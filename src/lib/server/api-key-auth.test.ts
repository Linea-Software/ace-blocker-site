import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// API-key auth compatibility (release plan Step 2.10): the engine authenticates
// to the site API with an API key — `x-api-key` (content-updater client) and
// `Authorization: Bearer` (generated ace_server_api client) — while browser
// session cookies keep working. The REAL auth.ts config (apiKey plugin with
// enableSessionForAPIKeys + apiKeyGetter) runs against the in-memory adapter,
// and the REAL Elysia app is driven end-to-end: signup → create API key →
// API-key-authenticated requests to the endpoints the engine calls.

vi.hoisted(() => {
	process.env.DODO_PAYMENTS_WEBHOOK_SECRET = Buffer.from(
		'webhook-test-secret-0123456789'
	).toString('base64');
	process.env.DODO_PAYMENTS_API_KEY = 'sk_test_0000000000000000';
	process.env.BETTER_AUTH_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
});

// The real auth.ts binds to the drizzle adapter; swap for the in-memory adapter.
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

vi.mock('$lib/server/db', () => ({
	db: {
		query: { user: { findFirst: vi.fn() }, session: { findFirst: vi.fn() } },
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

// pro helpers are spies — the API-key tests target auth, not license state.
vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn(),
	clearProExpiration: vi.fn(),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(true),
	getProStatus: vi.fn().mockResolvedValue({ isPro: true, expirationDate: new Date('2099-01-01') })
}));

vi.mock('$lib/server/email', () => ({
	resend: { emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' } }) } },
	getLocaleForEmail: vi.fn().mockResolvedValue('en'),
	sendWelcomeEmail: vi.fn(),
	sendPaymentReceiptEmail: vi.fn(),
	sendSubscriptionExpiringEmail: vi.fn(),
	sendSubscriptionCancelledEmail: vi.fn(),
	sendPaymentFailedEmail: vi.fn(),
	getTwoFactorEmailHtml: vi.fn(() => 'html'),
	// Echo the verification URL so tests can extract the token from the email.
	getVerificationEmailHtml: vi.fn((url: string) => url),
	getEmailOtpHtml: vi.fn(() => 'html'),
	getResetPasswordEmailHtml: vi.fn(() => 'html')
}));

// cdn/common.ts throws at import unless every Bunny env var is present.
vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
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

import { app } from '$lib/server/api/app';
import { auth as siteAuth } from '$lib/server/auth';

const BASE_URL = 'http://localhost';

async function apiRequest(path: string, headers: Record<string, string> = {}) {
	return app.handle(new Request(`${BASE_URL}${path}`, { headers }));
}

describe('API-key auth compatibility', () => {
	let apiKey: string;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Fresh user per test so keys never collide across tests.
		const email = `engine-${crypto.randomUUID()}@example.com`;
		const signup = await siteAuth.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: 'Engine User',
					email,
					password: 'correct-horse-battery-staple'
				})
			})
		);
		expect(signup.status).toBe(200);
		const { user } = (await signup.json()) as { user: { id: string } };

		const created = await siteAuth.api.createApiKey({
			body: { name: 'Desktop App', userId: user.id }
		});
		apiKey = created.key;
	});

	it('a valid x-api-key header authorizes engine requests (site-packs/scripts/account)', async () => {
		const res = await apiRequest('/api/v1/account/pro', { 'x-api-key': apiKey });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { isPro: boolean };
		expect(body.isPro).toBe(true);
	});

	it('issues a signed entitlement exclusively to the authenticated API-key owner', async () => {
		const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
		process.env.ACE_ENTITLEMENT_SIGNING_KEY_BASE64 = privateKey
			.export({
				type: 'pkcs8',
				format: 'der'
			})
			.toString('base64');
		process.env.ACE_ENTITLEMENT_PUBLIC_KEY_BASE64 = publicKey
			.export({
				type: 'spki',
				format: 'der'
			})
			.subarray(-32)
			.toString('base64');

		const res = await apiRequest('/api/v1/account/entitlement', { 'x-api-key': apiKey });
		expect(res.status).toBe(200);
		const body = (await res.json()) as { token: string };
		expect(body.token.split('.')).toHaveLength(3);
		const [header, payload, signature] = body.token.split('.');
		expect(
			crypto.verify(
				null,
				Buffer.from(`${header}.${payload}`),
				publicKey,
				Buffer.from(signature, 'base64url')
			)
		).toBe(true);
		const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
			key_sha256: string;
			sub: string;
		};
		expect(claims.key_sha256).toBe(crypto.createHash('sha256').update(apiKey).digest('hex'));
		expect(claims.sub).toBeTruthy();

		const unauthorized = await apiRequest('/api/v1/account/entitlement');
		expect(unauthorized.status).toBe(401);
	});

	it('Authorization: Bearer <api-key> also authorizes (generated engine client)', async () => {
		const res = await apiRequest('/api/v1/account/pro', {
			authorization: `Bearer ${apiKey}`
		});
		expect(res.status).toBe(200);
	});

	it('an invalid API key is rejected', async () => {
		const res = await apiRequest('/api/v1/account/pro', {
			'x-api-key': 'x'.repeat(80)
		});
		expect([401, 403]).toContain(res.status);
	});

	it('a missing API key is unauthorized', async () => {
		const res = await apiRequest('/api/v1/account/pro');
		expect(res.status).toBe(401);
	});

	it('session cookies still work alongside API keys', async () => {
		// Create a known user, verify the email (the site requires it before
		// sign-in), then sign in to obtain a session cookie.
		await siteAuth.handler(
			new Request(`${BASE_URL}/api/auth/sign-up/email`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name: 'Cookie User',
					email: 'engine-cookie@example.com',
					password: 'correct-horse-battery-staple'
				})
			})
		);
		const { resend } = await import('$lib/server/email');
		// Match the verification email for THIS user — beforeEach also fired one
		// for its random user.
		const verificationSend = vi
			.mocked(resend.emails.send)
			.mock.calls.find(
				(call) =>
					(call[0] as { to: string }).to === 'engine-cookie@example.com' &&
					(call[0] as { subject: string }).subject === 'Verify your email'
			);
		expect(verificationSend).toBeDefined();
		const verifyUrl = (verificationSend![0] as { html: string }).html;
		const token = new URL(verifyUrl).searchParams.get('token');
		expect(token).toBeTruthy();

		const verifyRes = await siteAuth.handler(
			new Request(`${BASE_URL}/api/auth/verify-email?token=${token}&callbackURL=${BASE_URL}/`)
		);
		expect(verifyRes.status).toBe(302);

		const signIn = await siteAuth.handler(
			new Request(`${BASE_URL}/api/auth/sign-in/email`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					email: 'engine-cookie@example.com',
					password: 'correct-horse-battery-staple'
				})
			})
		);
		expect(signIn.status).toBe(200);
		const cookie = signIn.headers
			.getSetCookie()
			.map((c) => c.split(';')[0])
			.join('; ');

		const res = await apiRequest('/api/v1/account/pro', { cookie });
		expect(res.status).toBe(200);
	});

	it('the public releases catalog needs no auth (engine content check)', async () => {
		const res = await apiRequest('/api/v1/releases/latest');
		expect(res.status).toBe(200);
	});
});
