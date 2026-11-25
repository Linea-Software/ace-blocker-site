import { describe, expect, it, vi } from 'vitest';

const { getProduct } = vi.hoisted(() => ({ getProduct: vi.fn() }));
vi.mock('$lib/server/products', () => ({ getProduct }));
vi.mock('$lib/server/auth', () => ({ auth: { api: { getSession: async () => null } } }));
vi.mock('$lib/server/pro', () => ({ isUserPro: async () => false }));

import { loadPricingData } from '$lib/server/pricing-page-data';

function load(event: { url: URL; request: Request }) {
	return loadPricingData(event.request, event.url.searchParams.get('currency') ?? '');
}
import {
	formatCurrency,
	countryToCurrency,
	timeZoneToCurrency,
	requestCurrency
} from '$lib/utils/locale-currency';
import { MONTHLY_PRICE_MAP, YEARLY_PRICE_MAP } from '$lib/server/seeder/price-maps';

function request(currency?: string, country?: string, language = 'en-US') {
	const url = new URL('https://aceblocker.com/get-pro');
	if (currency) url.searchParams.set('currency', currency);
	return {
		url,
		request: new Request(url, {
			headers: {
				'accept-language': language,
				...(country ? { 'x-ace-visitor-country': country } : {})
			}
		})
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
			expect(pricing.yearlyStrikethrough).toBe(formatCurrency(monthly * 12, currency));
			expect(pricing.yearlySavings).toBe(formatCurrency(monthly * 12 - yearly, currency));
			expect(pricing.discountPercent).toBe(Math.round((1 - yearly / (monthly * 12)) * 100));
			expect(pricing.monthlyPrice).toBe(formatCurrency(monthly, currency));
			expect(pricing.yearlyPrice).toBe(formatCurrency(yearly, currency));
			expect(pricing.yearlyTrialDays).toBe(14);
			expect(getProduct).toHaveBeenCalledWith('yearly', currency);
		}
	);

	it('uses actual registered product amounts and trial rather than seed defaults', async () => {
		getProduct.mockImplementation((cycle: string) =>
			cycle === 'monthly'
				? { productId: 'monthly', priceMinor: 700, trialDays: 0 }
				: { productId: 'yearly', priceMinor: 6000, trialDays: 7 }
		);
		const result = (await load(request('USD'))) as { pricing: Record<string, string | number> };
		expect(result.pricing.monthlyPrice).toBe('$7.00');
		expect(result.pricing.yearlyPrice).toBe('$60.00');
		expect(result.pricing.yearlySavings).toBe('$24.00');
		expect(result.pricing.monthlyTrialDays).toBe(0);
		expect(result.pricing.yearlyTrialDays).toBe(7);
	});

	it.each([
		['IT', 'EUR'],
		['DE', 'EUR'],
		['BG', 'EUR'],
		['GB', 'GBP'],
		['IN', 'INR'],
		['US', 'USD'],
		['CZ', 'USD'],
		['PL', 'USD'],
		['AU', 'USD']
	] as const)('maps location %s to %s, regardless of language', async (country, currency) => {
		getProduct.mockImplementation((cycle: string) => ({
			productId: cycle,
			priceMinor: cycle === 'monthly' ? 399 : 2499,
			trialDays: 14
		}));
		const result = (await load(request(undefined, country, 'en-US'))) as {
			pricing: Record<string, string | number>;
		};
		expect(result.pricing.currency).toBe(currency);
		expect(getProduct).toHaveBeenCalledWith('yearly', currency);
		expect(countryToCurrency(country)).toBe(currency);
	});

	it('falls back to USD without trusted country data, even when language is Italian', async () => {
		getProduct.mockReturnValue({ productId: 'test', priceMinor: 2499, trialDays: 14 });
		const result = (await load(request(undefined, undefined, 'it-IT'))) as {
			pricing: { currency: string };
		};
		expect(result.pricing.currency).toBe('USD');
	});

	it('ignores untrusted CDN country headers and malformed proxy country data', async () => {
		getProduct.mockReturnValue({ productId: 'test', priceMinor: 2499, trialDays: 14 });
		const url = new URL('https://aceblocker.com/get-pro');
		const event = {
			url,
			request: new Request(url, {
				headers: { 'cdn-requestcountrycode': 'IT', 'cf-ipcountry': 'GB' }
			})
		} as Parameters<typeof load>[0];
		const unverified = (await load(event)) as { pricing: { currency: string } };
		expect(unverified.pricing.currency).toBe('USD');

		const malformed = (await load({
			url,
			request: new Request(url, {
				headers: { 'x-ace-visitor-country': 'IT,GB' }
			})
		} as Parameters<typeof load>[0])) as { pricing: { currency: string } };
		expect(malformed.pricing.currency).toBe('USD');
	});

	it.each([
		['Europe/Rome', 'EUR'],
		['Europe/Berlin', 'EUR'],
		['Europe/Mariehamn', 'EUR'],
		['Europe/Sofia', 'EUR'],
		['Europe/Zagreb', 'EUR'],
		['America/Martinique', 'EUR'],
		['Indian/Reunion', 'EUR'],
		['Atlantic/Canary', 'EUR'],
		['Europe/London', 'GBP'],
		['Asia/Calcutta', 'INR'],
		['Asia/Kolkata', 'INR'],
		['America/New_York', 'USD'],
		['Europe/Zurich', 'USD'],
		['UTC', 'USD']
	] as const)('maps browser time zone %s to %s', (zone, currency) => {
		expect(timeZoneToCurrency(zone)).toBe(currency);
	});

	it('uses a supported browser hint only if edge country is unavailable', async () => {
		getProduct.mockReturnValue({ productId: 'test', priceMinor: 2499, trialDays: 14 });
		const local = request(undefined, undefined, 'en-US');
		expect((await loadPricingData(local.request, '', 'EUR')).pricing.currency).toBe('EUR');
		expect(
			(await loadPricingData(request(undefined, 'US').request, '', 'EUR')).pricing.currency
		).toBe('USD');
		expect(
			(await loadPricingData(request(undefined, 'IT').request, '', 'GBP')).pricing.currency
		).toBe('EUR');
		expect((await loadPricingData(local.request, 'GBP', 'EUR')).pricing.currency).toBe('GBP');
		expect(requestCurrency(new Headers({ 'x-ace-visitor-country': 'XX' }), 'EUR')).toBe('EUR');
		expect(requestCurrency(new Headers(), 'FAKE')).toBe('USD');
		expect(requestCurrency(new Headers({ 'cf-ipcountry': 'IT' }), '')).toBe('USD');
	});

	it('does not advertise a fictional price if a Dodo product is unavailable', async () => {
		getProduct.mockReturnValue(undefined);
		await expect(load(request(undefined, 'IT'))).rejects.toMatchObject({ status: 503 });
	});

	it('formats currency symbols before regional decimals', () => {
		expect(formatCurrency(2499, 'EUR')).toBe('€24,99');
		expect(formatCurrency(2499, 'USD')).toBe('$24.99');
		expect(formatCurrency(2499, 'GBP')).toBe('£24.99');
		expect(formatCurrency(59900, 'INR')).toBe('₹599');
	});
});
