import { dodoPayments } from './auth';
import { db } from './db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Two-level cache for pro status:
//   L1 – in-memory Map  (fast, lost on restart)
//   L2 – DB columns on the user row (persistent across restarts & instances)
// DodoPayments is only queried when both caches are stale.
//
// Heartbeat window: every time DodoPayments confirms active status, we extend
// proExpiration to max(actualNextBillingDate, now + 3 days). The engine only
// needs to call a pro-gated endpoint every ≤3 days to stay licensed.
// ---------------------------------------------------------------------------
const PRO_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const HEARTBEAT_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

interface CacheEntry {
	value: { isActive: boolean; expiration: Date };
	expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

/** Bust the L1 in-memory cache for a given email (called by webhook handlers). */
export function invalidateProCache(email: string): void {
	memoryCache.delete(email);
}

export async function getProStatus(
	email: string
): Promise<{ isActive: boolean; expiration: Date }> {
	const now = Date.now();

	// ── L1: in-memory cache ──────────────────────────────────────────────────
	const mem = memoryCache.get(email);
	if (mem && now < mem.expiresAt) {
		return mem.value;
	}

	// ── L2: DB cache ─────────────────────────────────────────────────────────
	const userRow = await db.query.user.findFirst({
		where: (u, { eq }) => eq(u.email, email),
		columns: { id: true, proStatusCachedAt: true, proExpiration: true }
	});

	if (
		userRow?.proStatusCachedAt &&
		now - userRow.proStatusCachedAt.getTime() < PRO_CACHE_TTL_MS
	) {
		const dbResult = {
			isActive: userRow.proExpiration !== null && userRow.proExpiration > new Date(),
			expiration: userRow.proExpiration ?? new Date(0)
		};
		// Promote into L1 so the next request in this process is instant
		memoryCache.set(email, { value: dbResult, expiresAt: now + PRO_CACHE_TTL_MS });
		return dbResult;
	}

	// ── L3: DodoPayments API ─────────────────────────────────────────────────
	const inactive = { isActive: false, expiration: new Date(0) };
	let result = inactive;

	try {
		const customers = await dodoPayments.customers.list({ email });

		if (customers.items && customers.items.length > 0) {
			const customerId = customers.items[0].customer_id;

			const subscriptions = await dodoPayments.subscriptions.list({
				customer_id: customerId,
				status: 'active'
			});

			if (subscriptions.items && subscriptions.items.length > 0) {
				let latestExpiration = new Date(0);
				for (const sub of subscriptions.items) {
					const nextBilling = sub.next_billing_date ? new Date(sub.next_billing_date) : new Date(0);
					if (nextBilling > latestExpiration) latestExpiration = nextBilling;
				}
				// Extend to at least now + 3 days as a heartbeat grace window
				const heartbeatDeadline = new Date(now + HEARTBEAT_WINDOW_MS);
				const effectiveExpiration =
					latestExpiration > heartbeatDeadline ? latestExpiration : heartbeatDeadline;
				result = { isActive: true, expiration: effectiveExpiration };
			}
		}
	} catch (error) {
		console.error('Error checking Pro status:', error);
		// On error: don't cache — let the next call retry immediately
		return inactive;
	}

	// Persist to DB (fire-and-forget, don't block the response)
	if (userRow?.id) {
		db.update(user)
			.set({
				proStatusCachedAt: new Date(),
				proExpiration: result.isActive ? result.expiration : null
			})
			.where(eq(user.id, userRow.id))
			.catch((e) => console.error('Failed to persist pro status cache:', e));
	}

	// Promote into L1
	memoryCache.set(email, { value: result, expiresAt: now + PRO_CACHE_TTL_MS });
	return result;
}

export async function isUserPro(email: string): Promise<boolean> {
	const proStatus = await getProStatus(email);
	return proStatus.isActive;
}

// ---------------------------------------------------------------------------
// Webhook helpers — called directly from auth.ts webhook handlers.
// They write to the DB immediately and bust the L1 cache so the next
// request sees the fresh status without waiting for a DodoPayments API call.
// ---------------------------------------------------------------------------

export async function updateProExpiration(email: string, nextBillingDate: Date | null): Promise<void> {
	const expiration = nextBillingDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // fallback: +30 days
	try {
		await db
			.update(user)
			.set({ proStatusCachedAt: new Date(), proExpiration: expiration })
			.where(eq(user.email, email));
		invalidateProCache(email);
		console.log(`✅ Pro status activated via webhook for ${email} until ${expiration.toISOString()}`);
	} catch (e) {
		console.error(`❌ Failed to update pro expiration for ${email}:`, e);
	}
}

export async function clearProExpiration(email: string): Promise<void> {
	try {
		await db
			.update(user)
			.set({ proStatusCachedAt: new Date(), proExpiration: null })
			.where(eq(user.email, email));
		invalidateProCache(email);
		console.log(`⛔ Pro status revoked via webhook for ${email}`);
	} catch (e) {
		console.error(`❌ Failed to clear pro expiration for ${email}:`, e);
	}
}
