import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth, dodoPayments } from '$lib/server/auth';
import { getProduct } from '$lib/server/products';
import {
	localeToCurrency,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import { createLogger } from '$lib/server/logger';

const log = createLogger('checkout:inline');

export const load: PageServerLoad = async ({ request, url }) => {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		const destination = new URL('/signin', url);
		destination.searchParams.set('redirectTo', url.pathname + url.search);
		redirect(303, destination.pathname + destination.search);
	}

	const cycle = url.searchParams.get('cycle') === 'monthly' ? 'monthly' : 'yearly';
	const requestedCurrency = url.searchParams.get('currency');
	const currency: SupportedCurrency =
		requestedCurrency && SUPPORTED_CURRENCIES.includes(requestedCurrency as SupportedCurrency)
			? (requestedCurrency as SupportedCurrency)
			: (localeToCurrency(request.headers.get('accept-language')) as SupportedCurrency);
	const product = getProduct(cycle, currency);
	if (!product) error(503, 'Checkout is temporarily unavailable');

	const completed = new URL('/checkout/completed', url);
	for (const key of ['origin', 'engine_port']) {
		const value = url.searchParams.get(key);
		if (value && value.length < 128 && (key !== 'engine_port' || /^\d{1,5}$/.test(value))) {
			completed.searchParams.set(key, value);
		}
	}

	try {
		const checkout = await dodoPayments.checkoutSessions.create({
			product_cart: [{ product_id: product.productId, quantity: 1 }],
			customer: { email: session.user.email, name: session.user.name },
			return_url: completed.toString()
		});
		if (
			!checkout.checkout_url ||
			new URL(checkout.checkout_url).hostname !== 'test.checkout.dodopayments.com'
		) {
			throw new Error('Unexpected checkout host');
		}
		return {
			checkoutUrl: checkout.checkout_url,
			cycle,
			currency,
			trialDays: product.trialDays,
			recurringPriceMinor: product.priceMinor ?? null
		};
	} catch (err) {
		log.error({ err }, 'Could not create inline checkout session');
		error(502, 'Unable to start checkout');
	}
};
