import { json, redirect } from '@sveltejs/kit';
import { dodoPayments } from '$lib/server/auth';

export async function GET({ url, locals, request }) {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/signin');
	}

	const slug = url.searchParams.get('slug');

	if (!slug) {
		return json({ error: 'Product slug is required' }, { status: 400 });
	}

	// 1. Resolve slug to productId
	const isProduction = process.env.NODE_ENV === 'production';
	const products: { productId: string; slug: string }[] = isProduction
		? [
				{ productId: 'pdt_PUT_PROD_MONTHLY_ID_HERE', slug: 'ace_blocker_monthly' },
				{ productId: 'pdt_PUT_PROD_YEARLY_ID_HERE', slug: 'ace_blocker_yearly' }
			]
		: [
				{ productId: 'pdt_0NXOnI40qSEVOqAnCUwmm', slug: 'ace_blocker_monthly' },
				{ productId: 'pdt_0NYXyjMDNixJ55IDOC42c', slug: 'ace_blocker_yearly' }
			];

	const product = products.find((p) => p.slug === slug);
	if (!product) {
		return json({ error: 'Invalid product slug' }, { status: 400 });
	}

	const productId = product.productId;

	try {
		// Find Dodo Customer ID by email
		const customers = await dodoPayments.customers.list({
			email: locals.user.email
		});

		if (customers.items && customers.items.length > 0) {
			const customer = customers.items[0];
			const customerId = customer.customer_id;

			// 2. Check if the user already has an active subscription
			const subscriptions = dodoPayments.subscriptions.list({
				customer_id: customerId
			});

			for await (const subscription of subscriptions) {
				if (subscription.status === 'active') {
					throw redirect(302, '/');
				}
			}

			// Check for active license keys too
			const licenses = await dodoPayments.licenseKeys.list({
				customer_id: customerId,
				status: 'active'
			});
			if (licenses.items && licenses.items.length > 0) {
				throw redirect(302, '/');
			}
		}

		// 3. Create checkout session
		const session = await dodoPayments.checkoutSessions.create({
			product_cart: [
				{
					product_id: productId,
					quantity: 1
				}
			],
			return_url: new URL('/checkout/completed', request.url).toString(),
			customer: {
				email: locals.user.email,
				name: locals.user.name
			}
		});

		if (session.checkout_url) {
			throw redirect(302, session.checkout_url);
		}

		return json({ error: 'Failed to generate checkout URL' }, { status: 500 });
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
			throw error;
		}
		console.error('Dodo Payments Error:', error);
		return json({ error: 'Failed to create checkout session' }, { status: 500 });
	}
}
