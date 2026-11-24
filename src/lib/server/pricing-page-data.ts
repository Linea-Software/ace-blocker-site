import { respond } from '@solidjs/web';
import { auth } from '$lib/server/auth';
import { isUserPro } from '$lib/server/pro';
import {
	formatCurrency,
	requestCurrency,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import { getProduct } from '$lib/server/products';

export async function loadPricingData(request: Request, currencyQuery: string = '') {
	const url = new URL('/get-pro', request.url);
	if (currencyQuery && currencyQuery.length < 12) url.searchParams.set('currency', currencyQuery);
	const session = await auth.api.getSession({ headers: request.headers });
	const isPro = session?.user ? await isUserPro(session.user.id) : false;
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
		throw respond({ error: 'Pricing is temporarily unavailable' }, { status: 503 });

	const monthlyRaw = monthlyProduct.priceMinor;
	const yearlyRaw = yearlyProduct.priceMinor;
	const savingsRaw = Math.max(0, monthlyRaw * 12 - yearlyRaw);
	const discountPercent = monthlyRaw > 0 ? Math.round((savingsRaw / (monthlyRaw * 12)) * 100) : 0;

	return {
		isPro,
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
}
