import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';

import postgres from 'postgres';

/** Real HTTP, UI, database and signed webhook; local fake email/payment transports. */
const BASE_URL = process.env.ACE_E2E_BASE_URL!;
const fixturePassword = 'correct-horse-battery-staple';

// Mirrors @dodopayments/core/webhook vendor standardwebhook (Svix-style).
function signWebhook(secret: string, id: string, timestampSec: number, body: string): string {
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	return crypto
		.createHmac('sha256', key)
		.update(`${id}.${timestampSec}.${body}`)
		.digest('base64');
}

/** Valid subscription.active payload (same shape the dev webhook script uses). */
function subscriptionActivePayload(email: string, nextBillingDate: string): object {
	return {
		business_id: 'brand_mock',
		type: 'subscription.active',
		timestamp: new Date().toISOString(),
		data: {
			payload_type: 'Subscription',
			addons: [],
			billing: { city: null, country: 'US', state: null, street: null, zipcode: null },
			brand_id: 'brand_mock',
			cancel_at_next_billing_date: false,
			created_at: new Date().toISOString(),
			credit_entitlement_cart: [],
			currency: 'USD',
			customer: { customer_id: 'cus_smoke', email, name: 'Smoke User' },
			metadata: {},
			meter_credit_entitlement_cart: [],
			meters: [],
			next_billing_date: nextBillingDate,
			on_demand: false,
			payment_frequency_count: 1,
			payment_frequency_interval: 'Month',
			previous_billing_date: new Date().toISOString(),
			product_id: 'pdt_smoke',
			quantity: 1,
			recurring_pre_tax_amount: 399,
			status: 'active',
			subscription_id: 'sub_smoke',
			subscription_period_count: 1,
			subscription_period_interval: 'Month',
			tax_inclusive: true,
			trial_period_days: 0
		}
	};
}

test('pro funnel: signup → get-pro → checkout → webhook → pro granted', async ({
	page,
	request
}) => {
	expect(process.env.ACE_E2E_ISOLATED).toBe('1');
	expect(process.env.DODO_PAYMENTS_WEBHOOK_SECRET).toBeTruthy();
	const email = `smoke-${Date.now()}@example.invalid`;
	await page.goto('/signup');
	await page.fill('#name', 'Smoke User');
	await page.fill('#email', email);
	await page.fill('#password', fixturePassword);
	await page.fill('#confirm-password', fixturePassword);
	await page.getByRole('button', { name: /sign up/i }).click();
	await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();

	// Email delivery is mocked. Mark only this newly created isolated user verified.
	const database = process.env.DATABASE_URL!;
	expect(new URL(database).hostname).toBe('127.0.0.1');
	expect(new URL(database).pathname).toBe('/ace_e2e');
	const sql = postgres(database);
	try {
		const verified =
			await sql`update "user" set email_verified=true where email=${email} returning id`;
		expect(verified).toHaveLength(1);
	} finally {
		await sql.end();
	}
	await page.goto('/signin');
	await page.fill('#email', email);
	await page.fill('#password', fixturePassword);
	await page.getByRole('button', { name: /sign in/i }).click();
	await expect(page).toHaveURL(`${BASE_URL}/`);

	// Checkout must remain on the site with the external test-mode iframe.
	// Block all real Dodo browser traffic; server-side SDK calls use fixture transport.
	await page.route(/^https:\/\/(?!127\.0\.0\.1:)/, (route) => route.abort());
	await page.route('https://test.checkout.dodopayments.com/**', (route) =>
		route.fulfill({
			status: 200,
			body: '<html>Test payment frame</html>',
			contentType: 'text/html'
		})
	);
	await page.goto('/get-pro');
	await page.getByRole('button', { name: 'Start 14-day free trial' }).click();
	await expect(page).toHaveURL(/\/checkout\?/);
	await expect(page.getByRole('heading', { name: 'Start your 14-day Pro trial' })).toBeVisible();
	await expect(page.getByRole('region', { name: 'Secure Dodo Payments checkout' })).toBeVisible();
	// A fixture frame does not implement Dodo's resize protocol. Verify the SDK
	// mounted the real test-mode iframe, rather than its fixture-dependent height.
	await expect(page.locator('#dodo-inline-checkout iframe')).toHaveAttribute(
		'src',
		/^https:\/\/test\.checkout\.dodopayments\.com\//
	);
	// 4. Synthetic signed webhook: subscription.active for the seeded user.
	const payload = subscriptionActivePayload(
		email,
		new Date(Date.now() + 30 * 86400000).toISOString()
	);
	const body = JSON.stringify(payload);
	const timestampSec = Math.floor(Date.now() / 1000);
	const webhookId = `smoke_${Date.now()}`;
	const webhook = await request.post(`${BASE_URL}/api/auth/dodopayments/webhooks`, {
		headers: {
			'content-type': 'application/json',
			'webhook-id': webhookId,
			'webhook-timestamp': String(timestampSec),
			'webhook-signature': `v1,${signWebhook(process.env.DODO_PAYMENTS_WEBHOOK_SECRET!, webhookId, timestampSec, body)}`
		},
		data: body
	});
	expect(webhook.status()).toBe(200);

	// 5. The account page reflects the granted Pro status.
	await page.goto('/checkout/completed');
	await expect(page.getByRole('heading', { name: 'Welcome to Ace Blocker Pro.' })).toBeVisible();
	await page.goto('/account');
	await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
});
