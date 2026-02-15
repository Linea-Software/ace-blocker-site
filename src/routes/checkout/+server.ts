import { json } from '@sveltejs/kit';
import { dodoPayments } from '$lib/server/auth';

import { z } from 'zod';

const CheckoutSchema = z.object({
	productId: z.string().optional(),
	quantity: z.number().int().positive().default(1)
});

export async function POST({ request, locals }) {

	if (!locals.session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const body = await request.json();
	const validation = CheckoutSchema.safeParse(body);

	if (!validation.success) {
		return json({ error: 'Invalid request', details: validation.error.format() }, { status: 400 });
	}

	const { productId, quantity } = validation.data;

	try {
		// Use fake product if none provided, for testing as requested
		const actualProductId = productId || 'pdt_0NXOnI40qSEVOqAnCUwmm';

		const session = await dodoPayments.checkoutSessions.create({
			product_cart: [
				{
					product_id: actualProductId,
					quantity: quantity
				}
			],
			return_url: new URL('/checkout/success', request.url).toString(),
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
