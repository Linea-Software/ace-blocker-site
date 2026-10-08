import { describe, expect, it, vi } from 'vitest';

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));
vi.mock('$lib/server/products', () => ({ getProduct }));

import { load } from './+page.server';
import { MONTHLY_PRICE_MAP, YEARLY_PRICE_MAP } from '$lib/server/seeder/price-maps';

function request(currency: string) {
	const url = new URL('https://aceblocker.com/get-pro?currency=' + currency);
	return {
		url,
		request: new Request(url, { headers: { 'accept-language': 'en-US' } })
	} as Parameters<typeof load>[0];
}

describe('Get Pro pricing', () => {
	it.each(['USD', 'EUR', 'GBP', 'INR'] as const)(
		'calculates %s savings from 12 monthly payments, not a previous annual price',
		async (currency) => {
			getProduct.mockImplementation((cycle: 'monthly' | 'yearly') => ({
				productId: cycle,
				trialDays: 14,
				priceMinor:
					cycle === 'monthly' ? MONTHLY_PRICE_MAP[currency] : YEARLY_PRICE_MAP[currency]
			}));
			const result = (await load(request(currency))) as {
				pricing: Record<string, string | number>;
			};
			const pricing = result.pricing;
			const monthly = MONTHLY_PRICE_MAP[currency];
			const yearly = YEARLY_PRICE_MAP[currency];
			const format = (v: number) =>
				currency === 'INR' ? String(Math.round(v / 100)) : (v / 100).toFixed(2);
			expect(pricing.yearlyStrikethrough).toBe(format(monthly * 12));
			expect(pricing.yearlySavings).toBe(format(monthly * 12 - yearly));
			expect(pricing.discountPercent).toBe(Math.round((1 - yearly / (monthly * 12)) * 100));
			expect(pricing.yearlyTrialDays).toBe(14);
			expect(getProduct).toHaveBeenCalledWith('yearly', currency);
		}
	);

	it('uses the actual registered product price and trial instead of seed defaults', async () => {
		getProduct.mockImplementation((cycle: string) =>
			cycle === 'monthly'
				? { productId: 'monthly', priceMinor: 700, trialDays: 0 }
				: { productId: 'yearly', priceMinor: 6000, trialDays: 7 }
		);
		const result = (await load(request('USD'))) as { pricing: Record<string, string | number> };
		expect(result.pricing.monthlyPrice).toBe('7.00');
		expect(result.pricing.yearlyPrice).toBe('60.00');
		expect(result.pricing.yearlySavings).toBe('24.00');
		expect(result.pricing.monthlyTrialDays).toBe(0);
		expect(result.pricing.yearlyTrialDays).toBe(7);
	});
});
