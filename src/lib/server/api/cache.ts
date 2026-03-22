import { db } from '$lib/server/db';
import { aceBlockerInstaller, resistanceModeScripts, trackingScripts, siteList } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

interface CacheData {
    installers: typeof aceBlockerInstaller.$inferSelect | null;
    resistance: typeof resistanceModeScripts.$inferSelect | null;
    tracking: typeof trackingScripts.$inferSelect | null;
    siteLists: Record<string, typeof siteList.$inferSelect>;
    timestamp: number;
}

let cache: CacheData | null = null;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes caching

export async function getLatestReleasesCache(): Promise<CacheData> {
    const now = Date.now();
    if (cache && (now - cache.timestamp) < CACHE_TTL) {
        return cache;
    }

    // Refresh memory cache from DB
    const latestInstaller = await db.select().from(aceBlockerInstaller)
        .where(eq(aceBlockerInstaller.canBeDownloaded, true))
        .orderBy(desc(aceBlockerInstaller.createdAt))
        .limit(1);

    const latestResistance = await db.select().from(resistanceModeScripts)
        .where(eq(resistanceModeScripts.canBeDownloaded, true))
        .orderBy(desc(resistanceModeScripts.createdAt))
        .limit(1);

    const latestTracking = await db.select().from(trackingScripts)
        .where(eq(trackingScripts.canBeDownloaded, true))
        .orderBy(desc(trackingScripts.createdAt))
        .limit(1);

    // For site lists, fetch all actively downloadable and group by siteListId
    const siteListsData = await db.select().from(siteList)
        .where(eq(siteList.canBeDownloaded, true))
        .orderBy(desc(siteList.updatedAt));

    const latestSiteLists: Record<string, typeof siteList.$inferSelect> = {};
    for (const list of siteListsData) {
        if (!latestSiteLists[list.id]) {
            latestSiteLists[list.id] = list; // Keeps the first (latest due to DESC)
        }
    }

    cache = {
        installers: latestInstaller[0] || null,
        resistance: latestResistance[0] || null,
        tracking: latestTracking[0] || null,
        siteLists: latestSiteLists,
        timestamp: now,
    };

    return cache;
}

export function invalidateCache() {
    cache = null;
}
