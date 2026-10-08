import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import {
	formatCurrency,
	requestCurrency,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import { getProduct } from '$lib/server/products';

export const load: PageServerLoad = async ({ request, url }) => {
	const requested = url.searchParams.get('currency');
	const currency: SupportedCurrency =
		requested && SUPPORTED_CURRENCIES.includes(requested as SupportedCurrency)
			? (requested as SupportedCurrency)
			: requestCurrency(request.headers);

	const monthlyProduct = getProduct('monthly', currency);
	const yearlyProduct = getProduct('yearly', currency);
	// Never advertise seed defaults when the checkout product is missing or
	// Dodo has not supplied an authoritative recurring price for that currency.
	if (monthlyProduct?.priceMinor == null || yearlyProduct?.priceMinor == null)
		error(503, 'Pricing is temporarily unavailable');

	const monthlyRaw = monthlyProduct.priceMinor;
	const yearlyRaw = yearlyProduct.priceMinor;
	const savingsRaw = Math.max(0, monthlyRaw * 12 - yearlyRaw);
	const discountPercent = monthlyRaw > 0 ? Math.round((savingsRaw / (monthlyRaw * 12)) * 100) : 0;

	return {
		pricing: {
			currency,
			monthlyPrice: formatCurrency(monthlyRaw, currency),
			yearlyPrice: formatCurrency(yearlyRaw, currency),
			yearlyStrikethrough: formatCurrency(monthlyRaw * 12, currency),
			yearlySavings: formatCurrency(savingsRaw, currency),
			discountPercent,
			monthlyTrialDays: monthlyProduct.trialDays,
			yearlyTrialDays: yearlyProduct.trialDays,
			monthlySlug: monthlyProduct.slug,
			yearlySlug: yearlyProduct.slug
		}
	};
};
