import { db } from '$lib/server/db';
import {
	aceBlockerInstaller,
	resistanceModeScripts,
	trackingScripts,
	siteList
} from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';
import { LRUCache } from 'lru-cache';

interface CacheData {
	installers: (typeof aceBlockerInstaller.$inferSelect) | null;
	resistance: (typeof resistanceModeScripts.$inferSelect) | null;
	tracking: (typeof trackingScripts.$inferSelect) | null;
	siteLists: Record<string, typeof siteList.$inferSelect>;
}

const cache = new LRUCache<string, CacheData>({
	max: 10,
	ttl: 1000 * 60 * 5 // 5 minutes caching
});

const CACHE_KEY = 'latest_releases';

export async function getLatestReleasesCache(): Promise<CacheData> {
	const cached = cache.get(CACHE_KEY);
	if (cached) {
		return cached;
	}

	// Refresh memory cache from DB
	const latestInstaller = await db
		.select()
		.from(aceBlockerInstaller)
		.where(eq(aceBlockerInstaller.canBeDownloaded, true))
		.orderBy(desc(aceBlockerInstaller.createdAt))
		.limit(1);

	const latestResistance = await db
		.select()
		.from(resistanceModeScripts)
		.where(eq(resistanceModeScripts.canBeDownloaded, true))
		.orderBy(desc(resistanceModeScripts.createdAt))
		.limit(1);

	const latestTracking = await db
		.select()
		.from(trackingScripts)
		.where(eq(trackingScripts.canBeDownloaded, true))
		.orderBy(desc(trackingScripts.createdAt))
		.limit(1);

	// For site lists, fetch all actively downloadable and group by siteListId
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

	const data: CacheData = {
		installers: latestInstaller[0] || null,
		resistance: latestResistance[0] || null,
		tracking: latestTracking[0] || null,
		siteLists: latestSiteLists
	};

	cache.set(CACHE_KEY, data);

	return data;
}

export function invalidateCache() {
	cache.clear();
}

