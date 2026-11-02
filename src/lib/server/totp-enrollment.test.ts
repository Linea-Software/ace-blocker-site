import { createHmac } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { twoFactor } from 'better-auth/plugins/two-factor';
import { describe, expect, it } from 'vitest';

const BASE_URL = 'http://localhost';

class CookieJar {
	private cookies = new Map<string, string>();

	capture(response: Response) {
		for (const header of response.headers.getSetCookie()) {
			const [pair] = header.split(';');
			const separator = pair.indexOf('=');
			if (separator > 0)
				this.cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
		}
	}

	header() {
		return [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
	}
}

function makeAuth() {
	return betterAuth({
		baseURL: BASE_URL,
		secret: '[REDACTED_SECRET]'.repeat(3),
		database: memoryAdapter({
			user: [],
			session: [],
			account: [],
			verification: [],
			twoFactor: []
		}),
		emailAndPassword: { enabled: true },
		plugins: [twoFactor({ issuer: 'Ace Blocker', skipVerificationOnEnable: false })]
	});
}

async function post(
	auth: ReturnType<typeof makeAuth>,
	path: string,
	body: unknown,
	jar: CookieJar
) {
	const response = await auth.handler(
		new Request(`${BASE_URL}${path}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				...(jar.header() ? { cookie: jar.header() } : {})
			},
			body: JSON.stringify(body)
		})
	);
	jar.capture(response);
	return response;
}

function decodeBase32(value: string): Buffer {
	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
	let bits = '';
	for (const char of value.replace(/=+$/g, '').toUpperCase()) {
		const index = alphabet.indexOf(char);
		if (index < 0) throw new Error('invalid base32');
		bits += index.toString(2).padStart(5, '0');
	}
	const bytes: number[] = [];
	for (let i = 0; i + 8 <= bits.length; i += 8)
		bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
	return Buffer.from(bytes);
}

function totpFromUri(uri: string): string {
	const secret = new URL(uri).searchParams.get('secret');
	if (!secret) throw new Error('TOTP URI did not contain a secret');
	const counter = Math.floor(Date.now() / 1000 / 30);
	const message = Buffer.alloc(8);
	message.writeBigUInt64BE(BigInt(counter));
	const digest = createHmac('sha1', decodeBase32(secret)).update(message).digest();
	const offset = digest[digest.length - 1] & 0x0f;
	const binary =
		((digest[offset] & 0x7f) << 24) |
		((digest[offset + 1] & 0xff) << 16) |
		((digest[offset + 2] & 0xff) << 8) |
		(digest[offset + 3] & 0xff);
	return String(binary % 1_000_000).padStart(6, '0');
}

describe('verified TOTP enrollment', () => {
	it('does not activate TOTP until the enrollment code is verified', async () => {
		const auth = makeAuth();
		const password = ['pass', 'word', '-unit-test-123'].join('');
		const email = 'totp-enrollment@example.com';
		const enrollmentJar = new CookieJar();

		expect(
			(
				await post(
					auth,
					'/api/auth/sign-up/email',
					{ name: 'TOTP User', email, password },
					enrollmentJar
				)
			).status
		).toBe(200);

		const enable = await post(
			auth,
			'/api/auth/two-factor/enable',
			{ password, method: 'totp' },
			enrollmentJar
		);
		expect(enable.status).toBe(200);
		const enabled = (await enable.json()) as { method: string; totpURI: string };
		expect(enabled.method).toBe('totp');

		const beforeVerification = await post(
			auth,
			'/api/auth/sign-in/email',
			{ email, password },
			new CookieJar()
		);
		expect(beforeVerification.status).toBe(200);
		expect(
			(await beforeVerification.json()) as { twoFactorRedirect?: boolean }
		).not.toHaveProperty('twoFactorRedirect', true);

		const verify = await post(
			auth,
			'/api/auth/two-factor/verify-totp',
			{ code: totpFromUri(enabled.totpURI) },
			enrollmentJar
		);
		expect(verify.status).toBe(200);

		const afterVerification = await post(
			auth,
			'/api/auth/sign-in/email',
			{ email, password },
			new CookieJar()
		);
		expect(afterVerification.status).toBe(200);
		expect((await afterVerification.json()) as { twoFactorRedirect?: boolean }).toMatchObject({
			twoFactorRedirect: true
		});
	});
});
