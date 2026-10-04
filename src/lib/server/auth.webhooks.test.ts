import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';

// Webhook → Pro lifecycle tests (spec §5.2 / release plan Step 5.2).
//
// Synthetic signed webhooks are POSTed through the real Better Auth request
// handler (`auth.handler`) so the full chain runs: Svix-style signature
// verification (@dodopayments/core/webhook vendor) → plugin dispatch →
// shouldProcessWebhook() digest gating → pro status updates → transactional
// emails. No real Dodo delivery: the DB, email sender and pro helpers are
// mocked at the module seam; the plugin's signature verification is real and
// the payloads are signed with the configured webhook secret.

// ── Env must be set before auth.ts is imported (vi.hoisted runs first) ─────
vi.hoisted(() => {
	// The vendored Webhook base64-decodes the secret; any valid base64 works.
	process.env.DODO_PAYMENTS_WEBHOOK_SECRET = Buffer.from(
		'webhook-test-secret-0123456789'
	).toString('base64');
	process.env.DODO_PAYMENTS_API_KEY = 'sk_test_0000000000000000';
	process.env.BETTER_AUTH_SECRET = 'test-secret-0123456789abcdef0123456789abcdef';
});

// ── Chainable db mock used by shouldProcessWebhook() ────────────────────────
// shouldProcessWebhook runs up to three selects per call (duplicate fast-path,
// latest-for-subscription, newer-after-claim) plus an insert and an optional
// delete. Results are driven by call-order queues set per test.
const { dbSelect, dbInsert, dbDelete, selectQueue, insertQueue } = vi.hoisted(() => ({
	dbSelect: vi.fn(),
	dbInsert: vi.fn(),
	dbDelete: vi.fn(),
	selectQueue: [] as unknown[][],
	insertQueue: [] as unknown[][]
}));

function selectChain(): any {
	const chain: any = {
		from: () => chain,
		where: () => chain,
		orderBy: () => chain,
		limit: vi.fn(() => Promise.resolve(selectQueue.shift() ?? []))
	};
	return chain;
}

function insertChain(): any {
	const chain: any = {
		values: () => chain,
		onConflictDoNothing: () => chain,
		returning: vi.fn(() => Promise.resolve(insertQueue.shift() ?? []))
	};
	return chain;
}

function deleteChain(): any {
	const chain: any = {
		where: vi.fn(() => Promise.resolve())
	};
	return chain;
}

dbSelect.mockImplementation(selectChain);
dbInsert.mockImplementation(insertChain);
dbDelete.mockImplementation(deleteChain);

vi.mock('$lib/server/db', () => ({
	db: {
		query: { user: { findFirst: vi.fn() }, session: { findFirst: vi.fn() } },
		select: dbSelect,
		insert: dbInsert,
		update: vi.fn(),
		delete: dbDelete
	}
}));

// ── Email sender seam (transactional emails from commit 8c95a37) ────────────
vi.mock('$lib/server/email', () => ({
	resend: { emails: { send: vi.fn().mockResolvedValue({ data: { id: 'test' } }) } },
	getLocaleForEmail: vi.fn().mockResolvedValue('en'),
	sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
	sendPaymentReceiptEmail: vi.fn().mockResolvedValue(undefined),
	sendSubscriptionExpiringEmail: vi.fn().mockResolvedValue(undefined),
	sendSubscriptionCancelledEmail: vi.fn().mockResolvedValue(undefined),
	sendPaymentFailedEmail: vi.fn().mockResolvedValue(undefined),
	getTwoFactorEmailHtml: vi.fn(() => 'html'),
	getVerificationEmailHtml: vi.fn(() => 'html'),
	getEmailOtpHtml: vi.fn(() => 'html')
}));

// ── Pro status helpers are spies: the handler decision is what we assert ────
vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn().mockResolvedValue(undefined),
	clearProExpiration: vi.fn().mockResolvedValue(undefined),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(false),
	getProStatus: vi.fn().mockResolvedValue({ isPro: false, expirationDate: null })
}));

// pino-pretty spawns a transport worker with piped stdio in dev; stubbing the
// logger keeps the test process from hanging on open handles at teardown.
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		child: () => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			fatal: vi.fn()
		})
	})
}));

import { auth } from './auth';
import { updateProExpiration, clearProExpiration } from './pro';
import {
	sendPaymentReceiptEmail,
	sendSubscriptionExpiringEmail,
	sendSubscriptionCancelledEmail,
	sendPaymentFailedEmail
} from './email';

const WEBHOOK_SECRET = process.env.DODO_PAYMENTS_WEBHOOK_SECRET!;
const EMAIL = 'user@example.com';
const SUBSCRIPTION_ID = 'sub_0Nh5UEeRJdJYMY3jNz54E';

// ── Synthetic payload builders (shapes mirror the site's dev webhook script) ─

interface SubscriptionData {
	payload_type: 'Subscription';
	addons: unknown[];
	billing: {
		city: string | null;
		country: string;
		state: string | null;
		street: string | null;
		zipcode: string | null;
	};
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

function subscriptionPayload(opts: {
	type: string;
	timestamp: string;
	status: SubscriptionData['status'];
	nextBillingDate: string;
	cancelAtNextBillingDate?: boolean;
	subscriptionId?: string;
	email?: string;
}): object {
	const data: SubscriptionData = {
		payload_type: 'Subscription',
		addons: [],
		billing: { city: null, country: 'US', state: null, street: null, zipcode: null },
		brand_id: 'brand_mock',
		cancel_at_next_billing_date: opts.cancelAtNextBillingDate ?? false,
		created_at: opts.timestamp,
		credit_entitlement_cart: [],
		currency: 'USD',
		customer: {
			customer_id: 'cus_0NabYPv75kIhBokp6q3xI',
			email: opts.email ?? EMAIL,
			name: 'Test User'
		},
		metadata: {},
		meter_credit_entitlement_cart: [],
		meters: [],
		next_billing_date: opts.nextBillingDate,
		on_demand: false,
		payment_frequency_count: 1,
		payment_frequency_interval: 'Month',
		previous_billing_date: opts.timestamp,
		product_id: 'pdt_0NhBiYHCYN8jYlmqemowv',
		quantity: 1,
		recurring_pre_tax_amount: 399,
		status: opts.status,
		subscription_id: opts.subscriptionId ?? SUBSCRIPTION_ID,
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

// ── Signing (mirrors @dodopayments/core/webhook vendor standardwebhook) ─────
function signPayload(secret: string, id: string, timestampSec: number, body: string): string {
	const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
	return crypto
		.createHmac('sha256', key)
		.update(`${id}.${timestampSec}.${body}`)
		.digest('base64');
}

async function postWebhook(
	payload: object,
	opts?: { msgId?: string; timestampSec?: number; signature?: string }
): Promise<Response> {
	const body = JSON.stringify(payload);
	const timestampSec = opts?.timestampSec ?? Math.floor(Date.now() / 1000);
	const msgId = opts?.msgId ?? `msg_${crypto.randomUUID()}`;
	const signature =
		opts?.signature ?? `v1,${signPayload(WEBHOOK_SECRET, msgId, timestampSec, body)}`;

	return auth.handler(
		new Request('http://localhost/api/auth/dodopayments/webhooks', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'webhook-id': msgId,
				'webhook-timestamp': String(timestampSec),
				'webhook-signature': signature
			},
			body
		})
	);
}

/** A webhook delivery that should be processed (no duplicates/stale rows). */
function primeFreshDelivery(): void {
	selectQueue.push([], []); // duplicate fast-path, latest-for-subscription
	insertQueue.push([{ id: crypto.randomUUID() }]); // successful claim
	selectQueue.push([]); // newer-after-claim guard
}

describe('dodo webhook → pro lifecycle (signed synthetic deliveries)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		selectQueue.length = 0;
		insertQueue.length = 0;
	});

	it('rejects an invalid signature with 400 before any processing', async () => {
		primeFreshDelivery();
		const payload = subscriptionPayload({
			type: 'subscription.active',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: '2027-06-29T08:23:52.809Z'
		});

		const res = await postWebhook(payload, { signature: 'v1,not-a-real-signature' });
		expect(res.status).toBe(400);
		expect(updateProExpiration).not.toHaveBeenCalled();
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('grants pro and sends a receipt email on subscription.active', async () => {
		primeFreshDelivery();
		const nextBilling = '2027-06-29T08:23:52.809Z';
		const payload = subscriptionPayload({
			type: 'subscription.active',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: nextBilling
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL, new Date(nextBilling));
		expect(sendPaymentReceiptEmail).toHaveBeenCalledExactlyOnceWith(EMAIL, 'en', {
			amountMinor: 399,
			currency: 'USD',
			processedAt: expect.any(Date),
			subscriptionId: SUBSCRIPTION_ID
		});
	});

	it('a retried delivery of the same event is a no-op (idempotency)', async () => {
		primeFreshDelivery();
		const payload = subscriptionPayload({
			type: 'subscription.active',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: '2027-06-29T08:23:52.809Z'
		});
		const msgId = `msg_${crypto.randomUUID()}`;

		const first = await postWebhook(payload, { msgId });
		expect(first.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledTimes(1);

		// Second delivery: the duplicate fast-path now finds the recorded event.
		selectQueue.push([{ id: 'already-processed' }]);

		const replay = await postWebhook(payload, { msgId });
		expect(replay.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledTimes(1);
		expect(sendPaymentReceiptEmail).toHaveBeenCalledTimes(1);
	});

	it('rejects a stale event (older timestamp than a processed one) for the same subscription', async () => {
		// subscription.active processed at T1
		primeFreshDelivery();
		const t1 = new Date('2026-09-01T00:00:00.000Z');
		const active = subscriptionPayload({
			type: 'subscription.active',
			timestamp: t1.toISOString(),
			status: 'active',
			nextBillingDate: '2027-06-01T00:00:00.000Z'
		});
		expect((await postWebhook(active)).status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledTimes(1);

		// subscription.cancelled (immediate) processed at T2 (newer)
		primeFreshDelivery();
		const t2 = new Date('2026-09-02T00:00:00.000Z');
		const cancelled = subscriptionPayload({
			type: 'subscription.cancelled',
			timestamp: t2.toISOString(),
			status: 'cancelled',
			nextBillingDate: '2026-10-01T00:00:00.000Z'
		});
		expect((await postWebhook(cancelled)).status).toBe(200);
		expect(clearProExpiration).toHaveBeenCalledTimes(1);

		// A NEW event (different digest) with an older timestamp arrives late.
		const t0 = new Date('2026-08-31T00:00:00.000Z');
		selectQueue.push([], [{ eventTimestamp: t2 }]); // dup fast-path, latest = T2
		const staleActive = subscriptionPayload({
			type: 'subscription.active',
			timestamp: t0.toISOString(),
			status: 'active',
			nextBillingDate: '2028-01-01T00:00:00.000Z'
		});
		const res = await postWebhook(staleActive);
		expect(res.status).toBe(200);
		// The stale event must NOT re-activate pro: the counts stay exactly
		// where the two processed events left them.
		expect(updateProExpiration).toHaveBeenCalledTimes(1);
		expect(clearProExpiration).toHaveBeenCalledTimes(1);
		expect(dbInsert).toHaveBeenCalledTimes(2); // the two processed events only
	});

	it('backs out when a newer event wins the race after the claim (final guard)', async () => {
		// dup fast-path [], latest [] , claim succeeds, then newer-after-claim
		// guard finds a row → the claimed row is deleted and the event skipped.
		selectQueue.push([], []);
		insertQueue.push([{ id: 'claimed' }]);
		selectQueue.push([{ id: 'newer-event' }]);

		const payload = subscriptionPayload({
			type: 'subscription.active',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: '2027-06-29T08:23:52.809Z'
		});
		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(dbDelete).toHaveBeenCalled();
		expect(updateProExpiration).not.toHaveBeenCalled();
	});

	it('scheduled cancellation keeps access until next_billing_date and sends the expiring email', async () => {
		primeFreshDelivery();
		const nextBilling = '2027-07-29T08:23:52.809Z';
		const payload = subscriptionPayload({
			type: 'subscription.cancelled',
			timestamp: new Date().toISOString(),
			status: 'cancelled',
			nextBillingDate: nextBilling,
			cancelAtNextBillingDate: true
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL, new Date(nextBilling));
		expect(clearProExpiration).not.toHaveBeenCalled();
		expect(sendSubscriptionExpiringEmail).toHaveBeenCalledExactlyOnceWith(
			EMAIL,
			new Date(nextBilling),
			'en'
		);
	});

	it('immediate cancellation removes pro and sends the cancelled email', async () => {
		primeFreshDelivery();
		const payload = subscriptionPayload({
			type: 'subscription.cancelled',
			timestamp: new Date().toISOString(),
			status: 'cancelled',
			nextBillingDate: '2027-06-29T08:23:52.809Z'
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(clearProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL);
		expect(updateProExpiration).not.toHaveBeenCalled();
		expect(sendSubscriptionCancelledEmail).toHaveBeenCalledExactlyOnceWith(
			EMAIL,
			new Date('2027-06-29T08:23:52.809Z'),
			'en'
		);
	});

	it('renewal extends access and sends a receipt email', async () => {
		primeFreshDelivery();
		const nextBilling = '2027-08-29T08:23:52.809Z';
		const payload = subscriptionPayload({
			type: 'subscription.renewed',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: nextBilling
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL, new Date(nextBilling));
		expect(sendPaymentReceiptEmail).toHaveBeenCalledExactlyOnceWith(EMAIL, 'en', {
			amountMinor: 399,
			currency: 'USD',
			processedAt: expect.any(Date),
			subscriptionId: SUBSCRIPTION_ID
		});
	});

	it('failed payment clears pro and sends the failed email', async () => {
		primeFreshDelivery();
		const payload = subscriptionPayload({
			type: 'subscription.failed',
			timestamp: new Date().toISOString(),
			status: 'failed',
			nextBillingDate: '2027-06-29T08:23:52.809Z'
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(clearProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL);
		expect(sendPaymentFailedEmail).toHaveBeenCalledExactlyOnceWith(EMAIL, 'en');
	});

	it('expired / on_hold / paused clear pro without an email', async () => {
		for (const [type, status] of [
			['subscription.expired', 'expired'],
			['subscription.on_hold', 'on_hold'],
			['subscription.paused', 'paused']
		] as const) {
			primeFreshDelivery();
			const payload = subscriptionPayload({
				type,
				timestamp: new Date().toISOString(),
				status,
				nextBillingDate: '2027-06-29T08:23:52.809Z'
			});
			const res = await postWebhook(payload);
			expect(res.status).toBe(200);
		}
		// One clear per event type — all keyed to the same email.
		expect(clearProExpiration).toHaveBeenCalledTimes(3);
		for (const call of vi.mocked(clearProExpiration).mock.calls) {
			expect(call[0]).toBe(EMAIL);
		}
		expect(updateProExpiration).not.toHaveBeenCalled();
		expect(sendPaymentReceiptEmail).not.toHaveBeenCalled();
		expect(sendSubscriptionExpiringEmail).not.toHaveBeenCalled();
		expect(sendSubscriptionCancelledEmail).not.toHaveBeenCalled();
		expect(sendPaymentFailedEmail).not.toHaveBeenCalled();
	});

	it('subscription.updated only activates while status is active', async () => {
		primeFreshDelivery();
		const nextBilling = '2027-09-01T08:23:52.809Z';
		const updated = subscriptionPayload({
			type: 'subscription.updated',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: nextBilling
		});
		expect((await postWebhook(updated)).status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL, new Date(nextBilling));

		primeFreshDelivery();
		const downgraded = subscriptionPayload({
			type: 'subscription.updated',
			timestamp: new Date().toISOString(),
			status: 'cancelled',
			nextBillingDate: nextBilling
		});
		expect((await postWebhook(downgraded)).status).toBe(200);
		expect(clearProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL);
	});

	it('subscription.plan_changed extends access to the new next billing date', async () => {
		primeFreshDelivery();
		const nextBilling = '2028-01-01T00:00:00.000Z';
		const payload = subscriptionPayload({
			type: 'subscription.plan_changed',
			timestamp: new Date().toISOString(),
			status: 'active',
			nextBillingDate: nextBilling
		});

		const res = await postWebhook(payload);
		expect(res.status).toBe(200);
		expect(updateProExpiration).toHaveBeenCalledExactlyOnceWith(EMAIL, new Date(nextBilling));
	});
});
