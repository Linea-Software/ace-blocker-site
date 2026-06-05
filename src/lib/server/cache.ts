import { db } from '$lib/server/db';
import {
	aceBlockerInstaller,
	resistanceModeScripts,
	trackingScripts,
	sitePack
} from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

// In-memory cache for latest artifacts (no need for LRU since we only store one of each)
let latestInstaller: typeof aceBlockerInstaller.$inferSelect | null = null;
let latestResistanceScript: typeof resistanceModeScripts.$inferSelect | null = null;
let latestTrackingScript: typeof trackingScripts.$inferSelect | null = null;
let latestSitePacks: Map<string, typeof sitePack.$inferSelect> = new Map();

// ============ INSTALLER ============

export async function loadLatestInstaller(): Promise<
	typeof aceBlockerInstaller.$inferSelect | null
> {
	const result = await db
		.select()
		.from(aceBlockerInstaller)
		.where(eq(aceBlockerInstaller.canBeDownloaded, true))
		.orderBy(desc(aceBlockerInstaller.createdAt))
		.limit(1);

	latestInstaller = result[0] || null;
	return latestInstaller;
}

export function getLatestInstaller(): typeof aceBlockerInstaller.$inferSelect | null {
	return latestInstaller;
}

// ============ RESISTANCE SCRIPTS ============

export async function loadLatestResistanceScript(): Promise<
	typeof resistanceModeScripts.$inferSelect | null
> {
	const result = await db
		.select()
		.from(resistanceModeScripts)
		.where(eq(resistanceModeScripts.canBeDownloaded, true))
		.orderBy(desc(resistanceModeScripts.createdAt))
		.limit(1);

	latestResistanceScript = result[0] || null;
	return latestResistanceScript;
}

export function getLatestResistanceScript(): typeof resistanceModeScripts.$inferSelect | null {
	return latestResistanceScript;
}

// ============ TRACKING SCRIPTS ============

export async function loadLatestTrackingScript(): Promise<
	typeof trackingScripts.$inferSelect | null
> {
	const result = await db
		.select()
		.from(trackingScripts)
		.where(eq(trackingScripts.canBeDownloaded, true))
		.orderBy(desc(trackingScripts.createdAt))
		.limit(1);

	latestTrackingScript = result[0] || null;
	return latestTrackingScript;
}

export function getLatestTrackingScript(): typeof trackingScripts.$inferSelect | null {
	return latestTrackingScript;
}

// ============ SITE PACKS ============

export async function loadLatestSitePacks(): Promise<Map<string, typeof sitePack.$inferSelect>> {
	const results = await db.select().from(sitePack).where(eq(sitePack.canBeDownloaded, true));

	latestSitePacks = new Map(results.map((item) => [item.id, item]));
	return latestSitePacks;
}

export function getLatestSitePacks(): Map<string, typeof sitePack.$inferSelect> {
	return latestSitePacks;
}

// ============ CACHE INVALIDATION HELPERS ============
// These reload the cache from database and return the new values

export async function invalidateInstallerCache(): Promise<
	typeof aceBlockerInstaller.$inferSelect | null
> {
	return await loadLatestInstaller();
}

export async function invalidateResistanceCache(): Promise<
	typeof resistanceModeScripts.$inferSelect | null
> {
	return await loadLatestResistanceScript();
}

export async function invalidateTrackingCache(): Promise<
	typeof trackingScripts.$inferSelect | null
> {
	return await loadLatestTrackingScript();
}

export async function invalidateSitePacksCache(): Promise<
	Map<string, typeof sitePack.$inferSelect>
> {
	return await loadLatestSitePacks();
}

// ============ INITIALIZE ALL CACHES ============

export async function initializeCache(): Promise<void> {
	await Promise.all([
		loadLatestInstaller(),
		loadLatestResistanceScript(),
		loadLatestTrackingScript(),
		loadLatestSitePacks()
	]);
}
