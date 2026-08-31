import { describe, it, expect, vi, beforeEach } from 'vitest';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import DodoPayments from 'dodopayments';
import { dodopayments, checkout } from '@dodopayments/better-auth';

// Checkout session creation (spec §7 / release plan Step 5.2): the Better Auth
// dodopayments checkout plugin endpoint at POST /api/auth/dodopayments/checkout-session.
//
// A test Better Auth instance mirrors the site's checkout config exactly
// (products: the real dodoProducts registry, successUrl, authenticatedUsersOnly)
// and runs against the memory adapter. The Dodo client is real but the network
// is the seam: fetch is stubbed, so the full chain runs — plugin → @dodopayments/core
// buildCheckoutUrl → real Dodo SDK → HTTP. The test-mode host decision comes
// from the real client's baseURL (https://test.dodopayments.com).
//
// Note: createCustomerOnSignUp is off here — the customer hook is orthogonal to
// checkout and is covered by the real-auth signup tests in auth-flows.test.ts.

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));

vi.stubGlobal('fetch', fetchMock);

import { registerProduct, dodoProducts } from './products';

const BASE_URL = 'http://localhost';

function makeAuth() {
	const client = new DodoPayments({
		bearerToken: 'sk_test_0000000000000000',
		environment: 'test_mode'
	});
	return betterAuth({
		baseURL: BASE_URL,
		secret: 'test-secret-0123456789abcdef0123456789abcdef',
		database: memoryAdapter({
			user: [],
			session: [],
			account: [],
			verification: [],
			apikey: [],
			twoFactor: []
		}),
		emailAndPassword: { enabled: true },
		plugins: [
			dodopayments({
				client,
				createCustomerOnSignUp: false,
				use: [
					checkout({
						products: dodoProducts,
						successUrl: '/checkout/completed',
						authenticatedUsersOnly: true
					})
				]
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
			this.cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1));
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

describe('dodo checkout session endpoint', () => {
	let auth: ReturnType<typeof makeAuth>;

	beforeEach(() => {
		fetchMock.mockReset();
		// The plugin holds a reference to the mutable dodoProducts array; reset
		// it and register the products the site seeds on boot.
		dodoProducts.length = 0;
		registerProduct('monthly', 'USD', 'prod_monthly_usd');
		registerProduct('yearly', 'USD', 'prod_yearly_usd');

		// The real SDK calls https://test.dodopayments.com/checkouts; stub the
		// response to a valid checkout-session payload.
		fetchMock.mockImplementation(async (url: string | URL | Request) => {
			const u = new URL(url instanceof Request ? url.url : String(url));
			expect(u.host).toBe('test.dodopayments.com');
			expect(u.pathname).toBe('/checkouts');
			return new Response(
				JSON.stringify({
					session_id: 'cs_test_1',
					checkout_url: 'https://test.checkout.dodopayments.com/checkout?session_id=cs_test_1'
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } }
			);
		});

		auth = makeAuth();
	});

	async function signedInJar() {
		const jar = new CookieJar();
		const res = await post(
			auth,
			'/api/auth/sign-up/email',
			{ name: 'Checkout User', email: 'checkout@example.com', password: 'correct-horse-battery-staple' },
			jar
		);
		expect(res.status).toBe(200);
		return jar;
	}

	it('returns a test-mode session URL for a known slug', async () => {
		const jar = await signedInJar();
		const res = await post(auth, '/api/auth/dodopayments/checkout-session', { slug: 'ace_blocker_monthly_usd' }, jar);
		expect(res.status).toBe(200);

		const body = (await res.json()) as { url: string; redirect: boolean };
		expect(body.redirect).toBe(true);
		expect(body.url).toContain('test.checkout.dodopayments.com');
		expect(body.url).toContain('cs_test_1');
	});

	it('sends the resolved product cart to the Dodo API with the session customer', async () => {
		const jar = await signedInJar();
		const res = await post(auth, '/api/auth/dodopayments/checkout-session', { slug: 'ace_blocker_monthly_usd' }, jar);
		expect(res.status).toBe(200);

		expect(fetchMock).toHaveBeenCalledOnce();
		const [, init] = fetchMock.mock.calls[0] as [unknown, RequestInit];
		// The API key authenticates the request.
		expect((init.headers as Headers).get('authorization')).toBe('Bearer sk_test_0000000000000000');
		// The request body carries the slug-resolved product cart and the
		// signed-in user's email as the customer.
		const sentBody = JSON.parse(String(init.body)) as {
			product_cart: { product_id: string; quantity: number }[];
			customer: { email: string; name: string };
			return_url: string;
		};
		expect(sentBody.product_cart).toEqual([{ product_id: 'prod_monthly_usd', quantity: 1 }]);
		expect(sentBody.customer).toEqual({ email: 'checkout@example.com', name: 'Checkout User' });
		// successUrl: '/checkout/completed' resolved against the request URL.
		expect(sentBody.return_url).toBe(`${BASE_URL}/checkout/completed`);
	});

	it('rejects an unknown slug with 400 before any Dodo call', async () => {
		const jar = await signedInJar();
		const res = await post(auth, '/api/auth/dodopayments/checkout-session', { slug: 'ace_blocker_nope_usd' }, jar);
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects a missing slug and product_cart with 400', async () => {
		const jar = await signedInJar();
		const res = await post(auth, '/api/auth/dodopayments/checkout-session', {}, jar);
		expect(res.status).toBe(400);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('requires a signed-in user (authenticatedUsersOnly)', async () => {
		const res = await post(auth, '/api/auth/dodopayments/checkout-session', { slug: 'ace_blocker_monthly_usd' }, new CookieJar());
		expect(res.status).toBe(401);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
