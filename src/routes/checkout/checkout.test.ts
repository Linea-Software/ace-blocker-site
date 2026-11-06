import { describe, expect, it, vi, beforeEach } from 'vitest';

const { getSession, createSession, previewSession, getProduct, checkoutLocale } = vi.hoisted(
	() => ({
		checkoutLocale: { current: 'en' },
		getSession: vi.fn(),
		createSession: vi.fn(),
		previewSession: vi.fn(),
		getProduct: vi.fn()
	})
);

vi.mock('$lib/server/auth', () => ({
	auth: { api: { getSession } },
	dodoPayments: { checkoutSessions: { create: createSession, preview: previewSession } }
}));
vi.mock('$lib/server/products', () => ({ getProduct }));
vi.mock('$lib/paraglide/runtime', () => ({ getLocale: () => checkoutLocale.current }));
vi.mock('$lib/server/logger', () => ({ createLogger: () => ({ error: vi.fn() }) }));

import { load } from './+page.server';

function request(url: string) {
	return {
		url: new URL(url),
		request: new Request(url, {
			headers: { 'accept-language': 'en-US', 'x-ace-visitor-country': 'GB' }
		})
	} as Parameters<typeof load>[0];
}

describe('inline checkout server loader', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		checkoutLocale.current = 'en';
		getSession.mockResolvedValue({ user: { email: 'customer@example.com', name: 'Customer' } });
		getProduct.mockReturnValue({
			productId: 'prod_test',
			slug: 'ace_blocker_monthly_gbp',
			trialDays: 14,
			priceMinor: 2499
		});
		previewSession.mockResolvedValue({
			currency: 'GBP',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2499 }
		});
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
		expect(createSession).toHaveBeenCalledWith(
			expect.objectContaining({
				product_cart: [{ product_id: 'prod_test', quantity: 1 }],
				billing_currency: 'GBP',
				feature_flags: { allow_currency_selection: false },
				customer: { email: 'customer@example.com', name: 'Customer' },
				return_url:
					'https://aceblocker.com/checkout/completed?origin=ace-engine&engine_port=1234'
			})
		);
		expect(createSession.mock.calls[0][0].customization).toMatchObject({
			theme: 'system',
			force_language: 'en',
			theme_config: {
				light: {
					bg_primary: '#F3F0E8',
					bg_secondary: '#FFFFFF',
					border_primary: '#746D60',
					border_secondary: '#968D80',
					button_primary: '#10100E',
					button_primary_hover: '#292925',
					input_focus_border: '#946000'
				},
				dark: {
					bg_secondary: '#414139',
					border_primary: '#C3BCAF',
					border_secondary: '#969088',
					button_primary: '#FFB000',
					button_primary_hover: '#FFC533',
					input_focus_border: '#FFB000'
				}
			}
		});
		expect(result).toMatchObject({
			cycle: 'monthly',
			currency: 'GBP',
			trialDays: 14,
			dueTodayMinor: 0,
			recurringPriceMinor: 2499
		});
		expect(previewSession).toHaveBeenCalledWith(
			expect.objectContaining({
				billing_currency: 'GBP',
				product_cart: [{ product_id: 'prod_test', quantity: 1 }]
			})
		);
		// Dodo follows the site's selected theme instead of relying on OS preference.
		await load(request('https://aceblocker.com/checkout?theme=dark'));
		expect(createSession.mock.calls[1][0].customization.theme).toBe('dark');
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

	it('uses the EUR product for Italian visitors and does not convert USD', async () => {
		const url = 'https://aceblocker.com/checkout?cycle=yearly';
		const event = {
			url: new URL(url),
			request: new Request(url, {
				headers: { 'accept-language': 'en-US', 'x-ace-visitor-country': 'IT' }
			})
		} as Parameters<typeof load>[0];
		previewSession.mockResolvedValueOnce({
			currency: 'EUR',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2499 }
		});
		const result = await load(event);
		expect(getProduct).toHaveBeenCalledWith('yearly', 'EUR');
		expect(createSession.mock.calls.at(-1)?.[0].billing_currency).toBe('EUR');
		expect(result).toMatchObject({
			currency: 'EUR',
			trialDays: 14,
			recurringPriceMinor: 2499,
			dueTodayMinor: 0
		});
	});

	it('refuses checkout if Dodo previews a converted or unexpected recurring amount', async () => {
		previewSession.mockResolvedValueOnce({
			currency: 'EUR',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2232 }
		});
		await expect(
			load(request('https://aceblocker.com/checkout?currency=EUR'))
		).rejects.toMatchObject({ status: 502 });
		expect(createSession).not.toHaveBeenCalled();
	});

	it('falls back to USD when no trusted geolocation header exists', async () => {
		const url = 'https://aceblocker.com/checkout';
		const event = {
			url: new URL(url),
			request: new Request(url, { headers: { 'accept-language': 'it-IT' } })
		} as Parameters<typeof load>[0];
		previewSession.mockResolvedValueOnce({
			currency: 'USD',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2499 }
		});
		await load(event);
		expect(getProduct).toHaveBeenCalledWith('yearly', 'USD');
	});

	it('matches the Dodo form language to the selected site locale', async () => {
		checkoutLocale.current = 'it';
		previewSession.mockResolvedValueOnce({
			currency: 'EUR',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2499 }
		});
		await load(request('https://aceblocker.com/checkout?currency=EUR'));
		expect(createSession.mock.calls[0][0].customization.force_language).toBe('it');
	});

	it('preserves an explicitly selected USD product even for an Italian visitor', async () => {
		const url = 'https://aceblocker.com/checkout?cycle=yearly&currency=USD';
		previewSession.mockResolvedValueOnce({
			currency: 'USD',
			trial_period_days: 14,
			current_breakup: { total_amount: 0 },
			recurring_breakup: { total_amount: 2499 }
		});
		const event = {
			url: new URL(url),
			request: new Request(url, {
				headers: { 'x-ace-visitor-country': 'IT', 'accept-language': 'it-IT' }
			})
		} as Parameters<typeof load>[0];
		await load(event);
		expect(getProduct).toHaveBeenCalledWith('yearly', 'USD');
		expect(previewSession.mock.calls[0][0].billing_currency).toBe('USD');
		expect(createSession.mock.calls[0][0].billing_currency).toBe('USD');
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
