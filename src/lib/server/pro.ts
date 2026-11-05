import { dodoPayments } from './auth';
import { db } from './db';
import { user, proStatus } from './db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { LRUCache } from 'lru-cache';
import { createLogger } from './logger';

const log = createLogger('pro');

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

interface CacheEntry {
	expiration: Date;
}

// user id to cache entry
const memoryCache = new LRUCache<string, CacheEntry>({
	max: 5000,
	ttl: PRO_CACHE_TTL_MS
});

/** Bust the L1 in-memory cache for a given email (called by webhook handlers). */
export function invalidateProCache(userId: string): void {
	memoryCache.delete(userId);
}

export async function isUserPro(userId: string): Promise<boolean> {
	const now = new Date();

	// We're first checking for the cache has the data we need
	const mem = memoryCache.get(userId);
	if (mem && now <= mem.expiration) {
		return true;
	}

	// otherwise let's see if the database has it

	const result = await db.select().from(proStatus).where(eq(proStatus.userId, userId)).limit(1);

	if (!result || result.length == 0) {
		return false;
	}

	const cachedLicence = result[0];
	if (!cachedLicence.expiration || now > cachedLicence.expiration) {
		return false;
	}

	return true;
}

/**
 * Returns the pro status and expiration date for a given user.
 * @param userId - The user ID to check
 * @returns An object with isPro boolean and expirationDate (null if not pro)
 */
export async function getProStatus(
	userId: string
): Promise<{ isPro: boolean; expirationDate: Date | null }> {
	const now = new Date();

	// Check L1 cache first
	const mem = memoryCache.get(userId);
	if (mem && now <= mem.expiration) {
		return { isPro: true, expirationDate: mem.expiration };
	}

	// Check L2 database cache
	const result = await db.select().from(proStatus).where(eq(proStatus.userId, userId)).limit(1);

	if (!result || result.length === 0) {
		return { isPro: false, expirationDate: null };
	}

	const cachedLicence = result[0];
	if (!cachedLicence.expiration || now > cachedLicence.expiration) {
		return { isPro: false, expirationDate: null };
	}

	return { isPro: true, expirationDate: cachedLicence.expiration };
}

// ---------------------------------------------------------------------------
// Webhook helpers — called directly from auth.ts webhook handlers.
// They write to the DB immediately and bust the L1 cache so the next
// request sees the fresh status without waiting for a DodoPayments API call.
// ---------------------------------------------------------------------------

export async function updateProExpiration(email: string, nextBillingDate: Date): Promise<void> {
	try {
		const userRow = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.email, email),
			columns: { id: true }
		});

		if (!userRow) {
			throw new Error('Paid customer email not linked to an ACE account');
		}
		if (userRow) {
			const proData = {
				id: crypto.randomUUID(),
				userId: userRow.id,
				cachedAt: new Date(),
				expiration: nextBillingDate
			};

			await db
				.insert(proStatus)
				.values(proData)
				.onConflictDoUpdate({
					target: proStatus.userId,
					set: {
						cachedAt: proData.cachedAt,
						expiration: proData.expiration
					}
				});
			// The L1 cache is keyed by user id (see getProStatus/isUserPro),
			// not by email — busting it with the email never invalidated it.
			invalidateProCache(userRow.id);
			log.info(
				{ email, nextBillingDate: nextBillingDate.toISOString() },
				'Pro status activated via webhook'
			);
		}
	} catch (e) {
		log.error({ err: e, email }, 'Failed to update pro expiration');
		throw e;
	}
}

export async function clearProExpiration(email: string): Promise<void> {
	try {
		const userRow = await db.query.user.findFirst({
			where: (u, { eq }) => eq(u.email, email),
			columns: { id: true }
		});

		if (!userRow) {
			throw new Error('Subscription customer email not linked to an ACE account');
		}
		if (userRow) {
			await db
				.update(proStatus)
				.set({ cachedAt: new Date(), expiration: null })
				.where(eq(proStatus.userId, userRow.id));
			// L1 cache is keyed by user id, not email (see getProStatus/isUserPro).
			invalidateProCache(userRow.id);
			log.info({ email }, 'Pro status revoked via webhook');
		}
	} catch (e) {
		log.error({ err: e, email }, 'Failed to clear pro expiration');
		throw e;
	}
}
