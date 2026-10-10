import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { auth, dodoPayments } from '$lib/server/auth';
import { getProduct } from '$lib/server/products';
import {
	requestCurrency,
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
			: requestCurrency(request.headers);
	const product = getProduct(cycle, currency);
	if (!product || product.priceMinor == null) error(503, 'Checkout is temporarily unavailable');
	const requestedTheme = url.searchParams.get('theme');
	const theme =
		requestedTheme === 'light' || requestedTheme === 'dark' ? requestedTheme : 'system';

	const completed = new URL('/checkout/completed', url);
	for (const key of ['origin', 'engine_port']) {
		const value = url.searchParams.get(key);
		if (value && value.length < 128 && (key !== 'engine_port' || /^\d{1,5}$/.test(value))) {
			completed.searchParams.set(key, value);
		}
	}

	try {
		// Preview the exact regional Dodo subscription, including its actual
		// free trial and recurring total. Never substitute the USD converted price.
		const preview = await dodoPayments.checkoutSessions.preview({
			product_cart: [{ product_id: product.productId, quantity: 1 }],
			customer: { email: session.user.email, name: session.user.name },
			billing_currency: currency
		});
		if (
			preview.currency !== currency ||
			preview.recurring_breakup?.total_amount !== product.priceMinor
		)
			throw new Error('Dodo recurring price or currency does not match regional product');
		const checkout = await dodoPayments.checkoutSessions.create({
			product_cart: [{ product_id: product.productId, quantity: 1 }],
			customer: { email: session.user.email, name: session.user.name },
			return_url: completed.toString(),
			billing_currency: currency,
			feature_flags: { allow_currency_selection: false },
			// The form lives inside a cross-origin Dodo frame. Customize it through
			// the checkout session; CSS from this page cannot style its inputs.
			customization: {
				theme,
				theme_config: {
					radius: '5px',
					font_size: 'md',
					light: {
						bg_primary: '#F3F0E8',
						bg_secondary: '#FFFDF7',
						border_primary: '#827C70',
						border_secondary: '#B6AEA0',
						text_primary: '#10100E',
						text_secondary: '#55534B',
						text_placeholder: '#59564F',
						input_focus_border: '#946000',
						button_primary: '#10100E',
						button_text_primary: '#FFFDF7'
					},
					dark: {
						bg_primary: '#1A1A17',
						bg_secondary: '#34342E',
						border_primary: '#AAA599',
						border_secondary: '#77746C',
						text_primary: '#F3F0E8',
						text_secondary: '#D7D2C7',
						text_placeholder: '#B5B0A4',
						input_focus_border: '#FFB000',
						button_primary: '#FFB000',
						button_text_primary: '#10100E'
					}
				}
			}
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
			trialDays: preview.trial_period_days ?? 0,
			recurringPriceMinor: preview.recurring_breakup.total_amount,
			dueTodayMinor: preview.current_breakup.total_amount
		};
	} catch (err) {
		log.error({ err }, 'Could not create inline checkout session');
		error(502, 'Unable to start checkout');
	}
};
