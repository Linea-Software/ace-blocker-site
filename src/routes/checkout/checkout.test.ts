import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getSession, createSession, getProduct } = vi.hoisted(() => ({
	getSession: vi.fn(),
	createSession: vi.fn(),
	getProduct: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	auth: { api: { getSession } },
	dodoPayments: { checkoutSessions: { create: createSession } }
}));
vi.mock('$lib/server/products', () => ({ getProduct }));
vi.mock('$lib/server/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }));

import { load } from './+page.server';

function request(url: string) {
	return {
		url: new URL(url),
		request: new Request(url, { headers: { 'accept-language': 'en-GB' } })
	} as Parameters<typeof load>[0];
}

describe('inline checkout server loader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSession.mockResolvedValue({ user: { email: 'customer@example.com', name: 'Customer' } });
		getProduct.mockReturnValue({ productId: 'prod_test', slug: 'ace_blocker_monthly_gbp' });
		createSession.mockResolvedValue({
			checkout_url: 'https://test.checkout.dodopayments.com/checkout?session_id=abc'
		});
	});

	it('creates a catalog-backed checkout with selected cycle and currency', async () => {
		const result = await load(
			request(
				'https://aceblocker.com/checkout?cycle=monthly&currency=GBP&origin=ace-engine&engine_port=1234'
			)
		);
		expect(getProduct).toHaveBeenCalledWith('monthly', 'GBP');
		expect(createSession).toHaveBeenCalledWith({
			product_cart: [{ product_id: 'prod_test', quantity: 1 }],
			customer: { email: 'customer@example.com', name: 'Customer' },
			return_url:
				'https://aceblocker.com/checkout/completed?origin=ace-engine&engine_port=1234'
		});
		expect(result).toMatchObject({ cycle: 'monthly', currency: 'GBP' });
	});

	it('ignores invalid currency and untrusted engine port', async () => {
		await load(request('https://aceblocker.com/checkout?currency=FAKE&engine_port=bad'));
		expect(getProduct).toHaveBeenCalledWith('yearly', 'GBP');
		expect(createSession.mock.calls[0][0].return_url).toBe(
			'https://aceblocker.com/checkout/completed'
		);
	});

	it('does not create sessions without authentication or an available product', async () => {
		getSession.mockResolvedValueOnce(null);
		await expect(
			load(request('https://aceblocker.com/checkout?cycle=monthly'))
		).rejects.toMatchObject({ status: 303 });
		expect(createSession).not.toHaveBeenCalled();
		getProduct.mockReturnValueOnce(undefined);
		await expect(load(request('https://aceblocker.com/checkout'))).rejects.toMatchObject({
			status: 503
		});
		expect(createSession).not.toHaveBeenCalled();
	});

	it('rejects a non-test hosted URL', async () => {
		createSession.mockResolvedValueOnce({
			checkout_url: 'https://checkout.dodopayments.com/checkout?session_id=abc'
		});
		await expect(load(request('https://aceblocker.com/checkout'))).rejects.toMatchObject({
			status: 502
		});
	});
});
