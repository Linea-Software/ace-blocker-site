import { expect, test } from '@playwright/test';
import crypto from 'node:crypto';

/**
 * Pro funnel smoke (release plan Step 5.2): signup → get-pro → checkout
 * (test mode) → synthetic signed webhook → Pro granted.
 *
 * Requires the DB-backed preview server (playwright.config.ts webServer) with
 * a seeded dev DB — `user1@example.com` / `password123` (email-verified, from
 * src/lib/server/seeder/user-seeder.ts) — and DODO_PAYMENTS_WEBHOOK_SECRET in
 * the server env to sign the synthetic delivery.
 *
 * NOT part of the vitest server CI gate: it runs under `bun run test:e2e`
 * against a real server + Postgres.
 */

const BASE_URL = 'http://127.0.0.1:4173';
const SEEDED_EMAIL = 'user1@example.com';
const SEEDED_PASSWORD = 'password123';

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

test('pro funnel: signup → get-pro → checkout → webhook → pro granted', async ({ page, request }) => {
	test.skip(
		!process.env.DODO_PAYMENTS_WEBHOOK_SECRET,
		'DODO_PAYMENTS_WEBHOOK_SECRET is required to sign the synthetic webhook delivery'
	);

	// 1. Signup — the verification email is sent, but the Resend link cannot be
	//    consumed in CI, so the checkout/webhook steps use the seeded user.
	const email = `smoke-${Date.now()}@example.com`;
	await page.goto('/signup');
	await page.fill('#name', 'Smoke User');
	await page.fill('#email', email);
	await page.fill('#password', 'correct-horse-battery-staple');
	await page.getByRole('button', { name: /sign up/i }).click();
	await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();

	// 2. Sign in as the seeded, email-verified dev user.
	await page.goto('/signin');
	await page.fill('#email', SEEDED_EMAIL);
	await page.fill('#password', SEEDED_PASSWORD);
	await page.getByRole('button', { name: /sign in/i }).click();
	await expect(page).toHaveURL(`${BASE_URL}/`);

	// 3. get-pro → upgrade → the checkout session redirects to the Dodo
	//    TEST-mode host (payments stay in test mode).
	await page.goto('/get-pro');
	await page.getByRole('button', { name: /upgrade to pro/i }).first().click();
	await expect(page).toHaveURL(/test\.checkout\.dodopayments\.com/, { timeout: 15_000 });

	// 4. Synthetic signed webhook: subscription.active for the seeded user.
	const payload = subscriptionActivePayload(SEEDED_EMAIL, '2027-06-29T08:23:52.809Z');
	const body = JSON.stringify(payload);
	const timestampSec = Math.floor(Date.now() / 1000);
	const webhookId = `smoke_${Date.now()}`;
	const webhook = await request.post(`${BASE_URL}/api/auth/dodopayments/webhooks`, {
		headers: {
			'webhook-id': webhookId,
			'webhook-timestamp': String(timestampSec),
			'webhook-signature': `v1,${signWebhook(process.env.DODO_PAYMENTS_WEBHOOK_SECRET!, webhookId, timestampSec, body)}`
		},
		data: body
	});
	expect(webhook.status()).toBe(200);

	// 5. The account page reflects the granted Pro status.
	await page.goto('/account');
	await expect(page.getByText('Pro', { exact: true }).first()).toBeVisible({ timeout: 15_000 });
});
