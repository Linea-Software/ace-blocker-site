import { redirect, respond } from '@solidjs/web';
import { auth, dodoPayments } from '$lib/server/auth';
import { getProduct } from '$lib/server/products';
import { requestCurrency } from '$lib/utils/locale-currency';
import { createLogger } from '$lib/server/logger';
import { localeFromPath, localizedPath } from '$lib/seo';

const log = createLogger('checkout:inline');

export async function loadCheckoutData(
	request: Request,
	queryString: string = '',
	browserHint: string = ''
) {
	// Validate the requested route before using its locale. A client may invoke
	// server functions directly, so never trust arbitrary absolute URLs.
	const safeQuery =
		typeof queryString === 'string' &&
		queryString.length < 1150 &&
		/^\/(?:it\/|de\/|es\/)?checkout(?:\?|$)/.test(queryString)
			? queryString
			: '/checkout';
	const url = new URL(safeQuery, request.url);
	const locale = localeFromPath(url.pathname);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		const destination = new URL(localizedPath('/signin', locale), url);
		destination.searchParams.set('redirectTo', url.pathname + url.search);
		throw redirect(destination.pathname + destination.search, 303);
	}

	const cycle = url.searchParams.get('cycle') === 'monthly' ? 'monthly' : 'yearly';
	const currency = requestCurrency(
		request.headers,
		browserHint,
		url.searchParams.get('currency')
	);
	const product = getProduct(cycle, currency);
	if (!product || product.priceMinor == null)
		throw respond({ error: 'Checkout is temporarily unavailable' }, { status: 503 });
	const requestedTheme = url.searchParams.get('theme');
	const theme =
		requestedTheme === 'light' || requestedTheme === 'dark' ? requestedTheme : 'system';

	const completed = new URL(localizedPath('/checkout/completed', locale), url);
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
				force_language: locale,
				theme_config: {
					radius: '5px',
					font_size: 'lg',
					light: {
						bg_primary: '#F3F0E8',
						bg_secondary: '#FFFFFF',
						border_primary: '#746D60',
						border_secondary: '#968D80',
						text_primary: '#10100E',
						text_secondary: '#55534B',
						text_placeholder: '#59564F',
						input_focus_border: '#946000',
						button_primary: '#10100E',
						button_primary_hover: '#292925',
						button_text_primary: '#FFFDF7'
					},
					dark: {
						bg_primary: '#1A1A17',
						bg_secondary: '#414139',
						border_primary: '#C3BCAF',
						border_secondary: '#969088',
						text_primary: '#F3F0E8',
						text_secondary: '#D7D2C7',
						text_placeholder: '#B5B0A4',
						input_focus_border: '#FFB000',
						button_primary: '#FFB000',
						button_primary_hover: '#FFC533',
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
		throw respond({ error: 'Unable to start checkout' }, { status: 502 });
	}
}
