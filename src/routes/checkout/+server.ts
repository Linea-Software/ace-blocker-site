import { json, redirect } from '@sveltejs/kit';
import { dodoPayments } from '$lib/server/auth';
import type { Product } from 'dodopayments/resources';

export async function GET({ url, locals, request }) {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/signin');
	}

	const slug = url.searchParams.get('slug');

	if (!slug) {
		return json({ error: 'Product slug is required' }, { status: 400 });
	}

	// 1. Resolve slug to productId against DODO_PAYMENTS_PRODUCTS
	const rawProducts = process.env.DODO_PAYMENTS_PRODUCTS;
	if (!rawProducts) {
		return json({ error: 'Server configuration error: Products not defined' }, { status: 500 });
	}

	let products: any[] = [];
	try {
		products = JSON.parse(rawProducts);
	} catch (e) {
		return json({ error: 'Server configuration error: Invalid products format' }, { status: 500 });
	}

	const product = products.find((p: any) => p.slug === slug);
	if (!product) {
		return json({ error: 'Invalid product slug' }, { status: 400 });
	}

	const productId = product.product_id || product.productId;

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
			return_url: new URL('/checkout/success', request.url).toString(),
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
