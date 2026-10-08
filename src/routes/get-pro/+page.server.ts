import type { PageServerLoad } from './$types';
import {
	localeToCurrency,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import { getProduct } from '$lib/server/products';
import { MONTHLY_PRICE_MAP, YEARLY_PRICE_MAP } from '$lib/server/seeder/price-maps';

/** Currency symbol lookup. */
const SYMBOL: Record<SupportedCurrency, string> = {
	USD: '$',
	EUR: '€',
	GBP: '£',
	INR: '₹'
};

/** Format a price in the smallest denomination to a display string. */
function formatPrice(cents: number, currency: SupportedCurrency): string {
	const isINR = currency === 'INR';
	const divided = cents / 100;
	if (isINR) return `${Math.round(divided)}`;
	return divided.toFixed(2);
}

export const load: PageServerLoad = async ({ request, url }) => {
	const locale = request.headers.get('accept-language') || 'en-US';
	const requested = url.searchParams.get('currency');
	const currency =
		requested && SUPPORTED_CURRENCIES.includes(requested as SupportedCurrency)
			? (requested as SupportedCurrency)
			: (localeToCurrency(locale) as SupportedCurrency);

	const monthlyProduct = getProduct('monthly', currency);
	const yearlyProduct = getProduct('yearly', currency);

	const monthlyRaw = monthlyProduct?.priceMinor ?? MONTHLY_PRICE_MAP[currency] ?? 399;
	const yearlyRaw = yearlyProduct?.priceMinor ?? YEARLY_PRICE_MAP[currency] ?? 2499;

	const monthlyPrice = formatPrice(monthlyRaw, currency);
	const yearlyPrice = formatPrice(yearlyRaw, currency);
	const yearlyStrikethrough = formatPrice(monthlyRaw * 12, currency);

	const savingsRaw = Math.max(0, monthlyRaw * 12 - yearlyRaw);
	const discountPercent = Math.round((savingsRaw / (monthlyRaw * 12)) * 100);

	return {
		pricing: {
			currency,
			symbol: SYMBOL[currency],
			monthlyPrice,
			yearlyPrice,
			yearlyStrikethrough,
			yearlySavings: formatPrice(savingsRaw, currency),
			discountPercent,
			monthlyTrialDays: monthlyProduct?.trialDays ?? 0,
			yearlyTrialDays: yearlyProduct?.trialDays ?? 0,
			monthlySlug: monthlyProduct?.slug ?? '',
			yearlySlug: yearlyProduct?.slug ?? ''
		}
	};
};
