import { db } from '$lib/server/db';
import {
	aceBlockerInstaller,
	resistanceModeScripts,
	trackingScripts,
	siteList
} from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

const CACHE_KEY = 'latest';

const installersCache = new LRUCache<string, typeof aceBlockerInstaller.$inferSelect>({
	max: 10,
	ttl: 1000 * 60 * 60 // 1 hour caching
});

const resistanceCache = new LRUCache<string, typeof resistanceModeScripts.$inferSelect>({
	max: 10,
	ttl: 1000 * 60 * 60 // 1 hour caching
});

const trackingCache = new LRUCache<string, typeof trackingScripts.$inferSelect>({
	max: 10,
	ttl: 1000 * 60 * 60 // 1 hour caching
});

const siteListsCache = new LRUCache<string, Record<string, typeof siteList.$inferSelect>>({
	max: 10,
	ttl: 1000 * 60 * 60 // 1 hour caching
});

export async function getLatestInstallerCache(): Promise<typeof aceBlockerInstaller.$inferSelect | null> {
	const cached = installersCache.get(CACHE_KEY);
	if (cached !== undefined) {
		return cached;
	}

	const latestInstaller = await db
		.select()
		.from(aceBlockerInstaller)
		.where(eq(aceBlockerInstaller.canBeDownloaded, true))
		.orderBy(desc(aceBlockerInstaller.createdAt))
		.limit(1);

	const data = latestInstaller[0] || null;
	if (data) installersCache.set(CACHE_KEY, data);
	return data;
}

export async function getLatestResistanceCache(): Promise<typeof resistanceModeScripts.$inferSelect | null> {
	const cached = resistanceCache.get(CACHE_KEY);
	if (cached !== undefined) {
		return cached;
	}

	const latestResistance = await db
		.select()
		.from(resistanceModeScripts)
		.where(eq(resistanceModeScripts.canBeDownloaded, true))
		.orderBy(desc(resistanceModeScripts.createdAt))
		.limit(1);

	const data = latestResistance[0] || null;
	if (data) resistanceCache.set(CACHE_KEY, data);
	return data;
}

export async function getLatestTrackingCache(): Promise<typeof trackingScripts.$inferSelect | null> {
	const cached = trackingCache.get(CACHE_KEY);
	if (cached !== undefined) {
		return cached;
	}

	const latestTracking = await db
		.select()
		.from(trackingScripts)
		.where(eq(trackingScripts.canBeDownloaded, true))
		.orderBy(desc(trackingScripts.createdAt))
		.limit(1);

	const data = latestTracking[0] || null;
	if (data) trackingCache.set(CACHE_KEY, data);
	return data;
}

export async function getLatestSiteListsCache(): Promise<Record<string, typeof siteList.$inferSelect>> {
	const cached = siteListsCache.get(CACHE_KEY);
	if (cached !== undefined) {
		return cached;
	}

	const siteListsData = await db
		.select()
		.from(siteList)
		.where(eq(siteList.canBeDownloaded, true))
		.orderBy(desc(siteList.updatedAt));

	const latestSiteLists: Record<string, typeof siteList.$inferSelect> = {};
	for (const list of siteListsData) {
		if (!latestSiteLists[list.id]) {
			latestSiteLists[list.id] = list; // Keeps the first (latest due to DESC)
		}
	}

	siteListsCache.set(CACHE_KEY, latestSiteLists);
	return latestSiteLists;
}

export function invalidateCache() {
	installersCache.clear();
	resistanceCache.clear();
	trackingCache.clear();
	siteListsCache.clear();
}
