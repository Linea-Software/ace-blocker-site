import { json } from '@sveltejs/kit';
import DodoPayments from 'dodopayments';
import { env } from '$env/dynamic/private';

export async function POST({ request, locals }) {
	// Optional: Check if user is authenticated
	// if (!locals.session) {
	// 	return json({ error: 'Unauthorized' }, { status: 401 });
	// }

	const { productId, quantity = 1 } = await request.json();

	if (!env.DODO_PAYMENTS_API_KEY) {
		return json({ error: 'Dodo Payments API key not configured' }, { status: 500 });
	}

	const client = new DodoPayments({
		bearerToken: env.DODO_PAYMENTS_API_KEY,
		environment: 'test_mode' // Default to test mode for safety
	});

	try {
		// Use fake product if none provided, for testing as requested
		const actualProductId = productId || 'prod_fake_123';

		const session = await client.checkoutSessions.create({
			product_cart: [
				{
					product_id: actualProductId,
					quantity: quantity
				}
			],
			return_url: new URL('/checkout/success', request.url).toString(),
			// optional: add customer info from locals.user if available
			customer: locals.user
				? {
						email: locals.user.email,
						name: locals.user.name
					}
				: undefined
		});

		return json({ url: session.checkout_url });
	} catch (error) {
		console.error('Dodo Payments Error:', error);
		return json({ error: 'Failed to create checkout session' }, { status: 500 });
	}
}
