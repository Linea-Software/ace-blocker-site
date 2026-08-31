import crypto from 'node:crypto';
import { eq, desc, gt, and, isNotNull } from 'drizzle-orm';
import { db } from './db';
import { dodoWebhookEvents } from './db/schema';
import { createLogger } from './logger';

const log = createLogger('webhook-events');

interface WebhookEventPayload {
	type: string;
	timestamp: Date;
	data: Record<string, unknown> & { subscription_id?: string };
}

/**
 * Decide whether a DodoPayments webhook payload should be applied.
 *
 * DodoPayments retries deliveries until it gets a 2xx response, so the same
 * event can be received multiple times. Payloads carry no event id and the
 * plugin does not expose the `webhook-id` header to handlers, so the
 * deterministic deduplication key is a digest of the normalized payload
 * (identical deliveries produce identical digests). The unique `eventKey`
 * makes concurrent/replayed duplicates no-ops.
 *
 * Additionally, for subscription events the event timestamp is compared with
 * the most recent event already recorded for the same subscription, so an
 * older event that arrives late (e.g. a replayed `subscription.active` after
 * a `subscription.cancelled`) is rejected instead of re-activating Pro.
 */
export async function shouldProcessWebhook(payload: WebhookEventPayload): Promise<boolean> {
	const eventKey = crypto
		.createHash('sha256')
		.update(
			JSON.stringify({
				type: payload.type,
				timestamp: payload.timestamp.toISOString(),
				data: payload.data
			})
		)
		.digest('hex');

	const subscriptionId =
		typeof payload.data?.subscription_id === 'string' ? payload.data.subscription_id : null;

	// Fast-path: already processed (same delivery retried).
	const existing = await db
		.select({ id: dodoWebhookEvents.id })
		.from(dodoWebhookEvents)
		.where(eq(dodoWebhookEvents.eventKey, eventKey))
		.limit(1);
	if (existing.length > 0) {
		log.debug({ type: payload.type, eventKey }, 'Duplicate webhook delivery skipped');
		return false;
	}

	if (subscriptionId) {
		const latest = await db
			.select({ eventTimestamp: dodoWebhookEvents.eventTimestamp })
			.from(dodoWebhookEvents)
			.where(
				and(
					eq(dodoWebhookEvents.subscriptionId, subscriptionId),
					isNotNull(dodoWebhookEvents.subscriptionId)
				)
			)
			.orderBy(desc(dodoWebhookEvents.eventTimestamp))
			.limit(1);

		if (latest[0] && payload.timestamp < latest[0].eventTimestamp) {
			log.debug(
				{ type: payload.type, subscriptionId },
				'Stale webhook event skipped (older than last processed)'
			);
			return false;
		}
	}

	// Atomic claim: only one processor can insert the eventKey.
	const inserted = await db
		.insert(dodoWebhookEvents)
		.values({
			id: crypto.randomUUID(),
			eventKey,
			type: payload.type,
			subscriptionId,
			eventTimestamp: payload.timestamp
		})
		.onConflictDoNothing()
		.returning({ id: dodoWebhookEvents.id });

	if (inserted.length === 0) {
		log.debug({ type: payload.type, eventKey }, 'Duplicate webhook delivery skipped (race)');
		return false;
	}

	// Final guard: if a newer event for the same subscription was recorded
	// between the ordering check and our claim, back out and reject.
	if (subscriptionId) {
		const newer = await db
			.select({ id: dodoWebhookEvents.id })
			.from(dodoWebhookEvents)
			.where(
				and(
					eq(dodoWebhookEvents.subscriptionId, subscriptionId),
					gt(dodoWebhookEvents.eventTimestamp, payload.timestamp)
				)
			)
			.limit(1);

		if (newer.length > 0) {
			await db.delete(dodoWebhookEvents).where(eq(dodoWebhookEvents.eventKey, eventKey));
			log.debug(
				{ type: payload.type, subscriptionId },
				'Stale webhook event skipped (newer event already processed)'
			);
			return false;
		}
	}

	return true;
}
