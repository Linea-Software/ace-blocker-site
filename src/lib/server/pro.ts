import { dodoPayments } from './auth';
import { db } from './db';
import { user } from './db/schema';
import { eq } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Two-level cache for pro status:
//   L1 – in-memory Map  (fast, lost on restart)
//   L2 – DB columns on the user row (persistent across restarts & instances)
// DodoPayments is only queried when both caches are stale.
// ---------------------------------------------------------------------------
const PRO_CACHE_TTL_MS = 20 * 60 * 1000; // 20 minutes

interface CacheEntry {
	value: { isActive: boolean; expiration: Date };
	expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

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
				result = { isActive: true, expiration: latestExpiration };
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
