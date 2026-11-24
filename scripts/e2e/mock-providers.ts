// Loaded ONLY by the isolated E2E server process. No request may reach a real provider.
import { randomUUID } from 'node:crypto';
if (process.env.ACE_E2E_ISOLATED !== '1' || !process.env.DATABASE_URL?.endsWith('/ace_e2e'))
	throw new Error('Provider fixtures require an isolated E2E database');
const prices = { USD: [399, 2499], EUR: [399, 2499], GBP: [399, 2499], INR: [9900, 59900] };
const products = Object.entries(prices).flatMap(([currency, amounts]) =>
	['Monthly', 'Yearly'].map((period, index) => ({
		name: 'Ace Blocker ' + period + ' ' + currency,
		product_id: 'pdt_fixture_' + period.toLowerCase() + '_' + currency,
		price_detail: {
			type: 'recurring_price',
			currency,
			price: amounts[index],
			tax_inclusive: true,
			trial_period_days: 14
		}
	}))
);
const original = globalThis.fetch;
const mock = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
	const request = new Request(input, init);
	const url = new URL(request.url);
	const json = (data: unknown) => Response.json(data);
	if (url.hostname === 'test.dodopayments.com') {
		if (url.pathname === '/products' && request.method === 'GET')
			return json({ items: products });
		if (url.pathname === '/customers' && request.method === 'POST') {
			const data = (await request.json()) as { email: string; name: string };
			return json({ ...data, customer_id: 'cus_fixture_' + randomUUID() });
		}
		if (url.pathname.startsWith('/customers/') && ['PATCH', 'PUT'].includes(request.method))
			return json({ ...(await request.json()), customer_id: url.pathname.split('/').at(-1) });
		if (url.pathname === '/customers' || url.pathname === '/subscriptions')
			return json({ items: [] });
		if (url.pathname === '/checkouts/preview') {
			const data = (await request.json()) as {
				product_cart: { product_id: string }[];
				billing_currency: string;
			};
			const product = products.find((p) => p.product_id === data.product_cart[0]?.product_id);
			if (!product) return new Response(null, { status: 400 });
			return json({
				currency: product.price_detail.currency,
				trial_period_days: 14,
				current_breakup: { total_amount: 0 },
				recurring_breakup: { total_amount: product.price_detail.price }
			});
		}
		if (url.pathname === '/checkouts')
			return json({
				checkout_url: 'https://test.checkout.dodopayments.com/checkout?session_id=fixture',
				session_id: 'fixture'
			});
	}
	if (url.hostname === 'api.resend.com' && url.pathname === '/emails')
		return json({ id: 'fixture-email' });
	if (url.hostname === 'api.github.com')
		return json({
			tag_name: 'fixture',
			published_at: null,
			created_at: new Date().toISOString(),
			assets: []
		});
	if (url.hostname === '127.0.0.1' || url.hostname === 'localhost') return original(input, init);
	throw new Error('Unexpected external E2E request: ' + url.hostname + url.pathname);
};
globalThis.fetch = Object.assign(mock, { preconnect: original.preconnect });
