/**
 * Dev-only end-to-end test for the DodoPayments webhook handling.
 *
 * Signs realistic webhook payloads with the configured webhook secret
 * (Svix-compatible: webhook-id / webhook-timestamp / webhook-signature),
 * posts them to the local server and verifies the resulting pro status in
 * the dev database. Run with:
 *
 *   bun scripts/test-dodo-webhooks.ts
 *
 * Requires: dev server on http://localhost:5173, dev DB reachable via
 * DATABASE_URL. Uses the seeder's dev user delivered+user1@resend.dev and its active
 * test-mode subscription (sub_0Nh5UEeRJdJYMY3jNz54E in this environment).
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import postgres from 'postgres';

const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:5173';
// Better Auth serves plugin endpoints under its base path (/api/auth), so the
// DodoPayments dashboard must be configured with:
//   https://<host>/api/auth/dodopayments/webhooks
const WEBHOOK_PATH = '/api/auth/dodopayments/webhooks';
const EMAIL = 'delivered+user1@resend.dev';
const SUBSCRIPTION_ID = process.env.TEST_SUBSCRIPTION_ID ?? 'sub_0Nh5UEeRJdJYMY3jNz54E';
const REQUEST_TIMEOUT_MS = 15_000;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!process.env.DODO_PAYMENTS_WEBHOOK_SECRET)
	throw new Error('DODO_PAYMENTS_WEBHOOK_SECRET is required');
const sql = postgres(process.env.DATABASE_URL);

// ── Signing (mirrors @dodopayments/core/webhook vendor standardwebhook) ────
function signPayload(secret: string, id: string, timestampSec: number, body: string): string {
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	return crypto
		.createHmac('sha256', key)
		.update(`${id}.${timestampSec}.${body}`)
		.digest('base64');
}

interface SubscriptionData {
	payload_type: 'Subscription';
	addons: unknown[];
	billing: { city: string; country: string; state: string; street: string; zipcode: string };
	brand_id: string;
	cancel_at_next_billing_date: boolean;
	created_at: string;
	credit_entitlement_cart: unknown[];
	currency: string;
	customer: { customer_id: string; email: string; name: string };
	metadata: Record<string, unknown>;
	meter_credit_entitlement_cart: unknown[];
	meters: unknown[];
	next_billing_date: string;
	on_demand: boolean;
	payment_frequency_count: number;
	payment_frequency_interval: 'Month';
	previous_billing_date: string;
	product_id: string;
	quantity: number;
	recurring_pre_tax_amount: number;
	status: 'pending' | 'active' | 'on_hold' | 'paused' | 'cancelled' | 'failed' | 'expired';
	subscription_id: string;
	subscription_period_count: number;
	subscription_period_interval: 'Month';
	tax_inclusive: boolean;
	trial_period_days: number;
}

function buildSubscriptionPayload(opts: {
	type:
		| 'subscription.active'
		| 'subscription.cancelled'
		| 'subscription.expired'
		| 'subscription.paused';
	eventId: string;
	timestamp: string;
	status: SubscriptionData['status'];
	nextBillingDate: string;
	cancelAtNextBillingDate?: boolean;
	createdAt?: string;
}): unknown {
	const data: SubscriptionData = {
		payload_type: 'Subscription',
		addons: [],
		billing: {
			city: 'Berlin',
			country: 'DE',
			state: null as unknown as string,
			street: 'Teststr. 1',
			zipcode: '10115'
		},
		brand_id: 'brand_mock',
		cancel_at_next_billing_date: opts.cancelAtNextBillingDate ?? false,
		created_at: opts.createdAt ?? opts.timestamp,
		credit_entitlement_cart: [],
		currency: 'USD',
		customer: { customer_id: 'cus_0NabYPv75kIhBokp6q3xI', email: EMAIL, name: 'Free User 1' },
		metadata: {},
		meter_credit_entitlement_cart: [],
		meters: [],
		next_billing_date: opts.nextBillingDate,
		on_demand: false,
		payment_frequency_count: 1,
		payment_frequency_interval: 'Month',
		previous_billing_date: opts.createdAt ?? opts.timestamp,
		product_id: 'pdt_0NhBiYHCYN8jYlmqemowv',
		quantity: 1,
		recurring_pre_tax_amount: 9.99,
		status: opts.status,
		subscription_id: SUBSCRIPTION_ID,
		subscription_period_count: 1,
		subscription_period_interval: 'Month',
		tax_inclusive: true,
		trial_period_days: 0
	};
	return {
		business_id: 'brand_mock',
		type: opts.type,
		timestamp: opts.timestamp,
		data
	};
}

async function postWebhook(
	eventId: string,
	payload: unknown,
	overrides?: { signature?: string }
): Promise<{ status: number; body: string }> {
	const body = JSON.stringify(payload);
	const timestampSec = Math.floor(Date.now() / 1000);
	// The header value is versioned: "v1,<base64 hmac>". signPayload returns
	// the raw base64, so prefix it here (matches Svix/Dodo webhook format).
	const signature =
		overrides?.signature ??
		`v1,${signPayload(process.env.DODO_PAYMENTS_WEBHOOK_SECRET!, eventId, timestampSec, body)}`;

	if (process.env.TEST_DEBUG) {
		console.error(
			`    [debug] ${eventId} ts=${timestampSec} sig=${signature.slice(0, 20)} keyLen=${(process.env.DODO_PAYMENTS_WEBHOOK_SECRET ?? '').length} bodyLen=${body.length} idMatch=${body.includes(eventId)}`
		);
	}

	const res = await fetch(`${BASE_URL}${WEBHOOK_PATH}`, {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'webhook-id': eventId,
			'webhook-timestamp': String(timestampSec),
			'webhook-signature': signature
		},
		body,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
	});
	const text = await res.text();
	if (res.status !== 200 && text.length < 500) {
		console.error(`    [webhook ${eventId} -> ${res.status}] ${text}`);
	}
	return { status: res.status, body: text };
}

async function proExpiration(): Promise<Date | null> {
	const rows = await sql<{ expiration: Date | null }[]>`
		SELECT expiration FROM pro_status WHERE user_id = (
			SELECT id FROM "user" WHERE email = ${EMAIL}
		)`;
	return rows[0]?.expiration ?? null;
}

async function processedCount(keySubstring?: string): Promise<number> {
	if (keySubstring !== undefined) {
		// count by type to keep assertions simple below
		const rows = await sql<{ count: number }[]>`
			SELECT COUNT(*)::int AS count FROM dodo_webhook_events WHERE type = ${keySubstring}`;
		return rows[0]?.count ?? 0;
	}
	const rows = await sql<{ count: number }[]>`
		SELECT COUNT(*)::int AS count FROM dodo_webhook_events`;
	return rows[0]?.count ?? 0;
}

async function main(): Promise<void> {
	let failures = 0;
	function check(name: string, condition: boolean, detail = ''): void {
		if (condition) {
			console.log(`  PASS  ${name}`);
		} else {
			failures += 1;
			console.error(`  FAIL  ${name} ${detail}`);
		}
	}

	const now = new Date().toISOString();
	const hourAgo = new Date(Date.now() - 3600_000).toISOString();
	const expiry = '2027-06-29T08:23:52.809Z';

	console.log(`→ test event: subscription.active (${EMAIL})`);
	const active = buildSubscriptionPayload({
		type: 'subscription.active',
		eventId: 'evt_active_1',
		timestamp: now,
		status: 'active',
		nextBillingDate: expiry
	});
	const activeBefore = await processedCount('subscription.active');
	const r1 = await postWebhook('evt_active_1', active);
	check('active returns 200', r1.status === 200, `got ${r1.status}`);
	check(
		'active sets pro expiration',
		(await proExpiration())?.toISOString().startsWith('2027-06-29') ?? false
	);
	check(
		'active records exactly one processed event',
		(await processedCount('subscription.active')) === activeBefore + 1,
		`count=${await processedCount('subscription.active')}`
	);

	console.log('→ replay the exact same delivery');
	const r1b = await postWebhook('evt_active_1', active);
	check('replay returns 200', r1b.status === 200, `got ${r1b.status}`);
	check(
		'replay does not create a second processed event',
		(await processedCount('subscription.active')) === activeBefore + 1,
		`count=${await processedCount('subscription.active')}`
	);

	console.log('→ subscription.cancelled with cancel_at_next_billing_date=true');
	const cancelNext = '2027-07-29T08:23:52.809Z';
	const cancelled = buildSubscriptionPayload({
		type: 'subscription.cancelled',
		eventId: 'evt_cancel_1',
		timestamp: new Date().toISOString(),
		status: 'cancelled',
		nextBillingDate: cancelNext,
		cancelAtNextBillingDate: true
	});
	const r2 = await postWebhook('evt_cancel_1', cancelled);
	check('cancelled returns 200', r2.status === 200, `got ${r2.status}`);
	check(
		'scheduled cancellation keeps access until period end',
		(await proExpiration())?.toISOString().startsWith('2027-07-29') ?? false,
		`got ${await proExpiration()}`
	);

	console.log('→ subscription.expired');
	const expired = buildSubscriptionPayload({
		type: 'subscription.expired',
		eventId: 'evt_expired_1',
		timestamp: new Date().toISOString(),
		status: 'expired',
		nextBillingDate: cancelNext
	});
	const r3 = await postWebhook('evt_expired_1', expired);
	check('expired returns 200', r3.status === 200, `got ${r3.status}`);
	check('expired clears pro expiration', (await proExpiration()) === null);

	console.log('→ stale replay: old subscription.active after expired');
	const r4 = await postWebhook('evt_active_1', active);
	check('stale replay returns 200', r4.status === 200, `got ${r4.status}`);
	check('stale replay does not re-activate pro', (await proExpiration()) === null);

	console.log('→ stale NEW event (older timestamp, different body)');
	const staleActive = buildSubscriptionPayload({
		type: 'subscription.active',
		eventId: 'evt_active_stale',
		timestamp: hourAgo,
		status: 'active',
		nextBillingDate: '2028-01-01T00:00:00.000Z'
	});
	const r5 = await postWebhook('evt_active_stale', staleActive);
	check('stale event returns 200', r5.status === 200, `got ${r5.status}`);
	check('stale event is not applied', (await proExpiration()) === null);

	console.log('→ invalid signature');
	const r6 = await postWebhook('evt_bad_sig', active, { signature: 'v1,invalidsignature' });
	check('invalid signature rejected with 400', r6.status === 400, `got ${r6.status}`);

	console.log('→ subscription.paused');
	const paused = buildSubscriptionPayload({
		type: 'subscription.paused',
		eventId: 'evt_paused_1',
		timestamp: new Date().toISOString(),
		status: 'paused',
		nextBillingDate: '2027-08-29T08:23:52.809Z'
	});
	// Re-activate first so pausing actually has something to clear
	const r7a = await postWebhook(
		'evt_active_2',
		buildSubscriptionPayload({
			type: 'subscription.active',
			eventId: 'evt_active_2',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: '2027-08-29T08:23:52.809Z'
		})
	);
	const r7b = await postWebhook('evt_paused_1', paused);
	check('re-activate returns 200', r7a.status === 200, `got ${r7a.status}`);
	check('paused returns 200', r7b.status === 200, `got ${r7b.status}`);
	check('paused clears pro expiration', (await proExpiration()) === null);

	console.log(failures === 0 ? '\nAll webhook tests passed.' : `\n${failures} check(s) failed.`);
	if (failures > 0) throw new Error('Webhook checks failed: ' + failures);
}

try {
	await main();
} catch (error) {
	console.error(error);
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
