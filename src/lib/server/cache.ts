import { db } from '$lib/server/db';
import {
	aceBlockerInstaller,
	resistanceModeScripts,
	trackingScripts,
	sitePack
} from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { createLogger } from '$lib/server/logger';

const log = createLogger('cache');

// In-memory cache for latest artifacts (no need for LRU since we only store one of each)
let latestInstaller: typeof aceBlockerInstaller.$inferSelect | null = null;
// Latest downloadable installer per (os, architecture) target — the download
// route picks the newest row for the requested platform instead of whatever
// was uploaded last.
let latestInstallersByTarget: Map<string, typeof aceBlockerInstaller.$inferSelect> = new Map();
let latestResistanceScript: typeof resistanceModeScripts.$inferSelect | null = null;
let latestTrackingScript: typeof trackingScripts.$inferSelect | null = null;
let latestSitePacks: Map<string, typeof sitePack.$inferSelect> = new Map();

// ============ INSTALLER ============

function installerKey(os: string, architecture: string): string {
	return `${os}:${architecture}`;
}

export async function loadLatestInstaller(): Promise<
	typeof aceBlockerInstaller.$inferSelect | null
> {
	const results = await db
		.select()
		.from(aceBlockerInstaller)
		.where(eq(aceBlockerInstaller.canBeDownloaded, true))
		.orderBy(desc(aceBlockerInstaller.createdAt));

	latestInstaller = results[0] || null;

	// Rows come back newest-first, so the first row seen per (os, arch)
	// combo is that combo's latest downloadable release.
	const byTarget = new Map<string, typeof aceBlockerInstaller.$inferSelect>();
	for (const row of results) {
		const key = installerKey(row.os, row.architecture);
		if (!byTarget.has(key)) byTarget.set(key, row);
	}
	latestInstallersByTarget = byTarget;

	return latestInstaller;
}

export function getLatestInstaller(): typeof aceBlockerInstaller.$inferSelect | null {
	return latestInstaller;
}

/** Latest downloadable installer for a specific (os, architecture) target. */
export function getInstallerFor(
	os: 'windows' | 'linux' | 'macos',
	architecture: 'x64' | 'arm64'
): typeof aceBlockerInstaller.$inferSelect | null {
	return latestInstallersByTarget.get(installerKey(os, architecture)) ?? null;
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

// ============ DOWNLOAD COUNT INCREMENT ============

/**
 * Increment the download count of the latest installer for a target by 1.
 * When no target is given, the globally latest installer is used (legacy
 * callers that do not care about the platform).
 */
export async function incrementInstallerDownloadCount(
	os?: 'windows' | 'linux' | 'macos',
	architecture?: 'x64' | 'arm64'
): Promise<void> {
	const target = os && architecture ? getInstallerFor(os, architecture) : latestInstaller;
	if (!target) return;

	await db
		.update(aceBlockerInstaller)
		.set({ downloadCount: sql`${aceBlockerInstaller.downloadCount} + 1` })
		.where(eq(aceBlockerInstaller.id, target.id));

	// Update the in-memory caches to reflect the new count
	if (latestInstaller && latestInstaller.id === target.id) {
		latestInstaller = { ...latestInstaller, downloadCount: latestInstaller.downloadCount + 1 };
	}
	const key = installerKey(target.os, target.architecture);
	const cached = latestInstallersByTarget.get(key);
	if (cached && cached.id === target.id) {
		latestInstallersByTarget.set(key, { ...cached, downloadCount: cached.downloadCount + 1 });
	}

	log.debug(
		{ id: target.id, os: target.os, architecture: target.architecture },
		'Incremented installer download count'
	);
}

/** Increment the download count for the latest resistance mode scripts by 1. */
export async function incrementResistanceScriptDownloadCount(): Promise<void> {
	const latest = getLatestResistanceScript();
	if (!latest) return;

	await db
		.update(resistanceModeScripts)
		.set({ downloadCount: sql`${resistanceModeScripts.downloadCount} + 1` })
		.where(eq(resistanceModeScripts.id, latest.id));

	if (latestResistanceScript) {
		latestResistanceScript = { ...latestResistanceScript, downloadCount: latestResistanceScript.downloadCount + 1 };
	}

	log.debug({ id: latest.id }, 'Incremented resistance scripts download count');
}

/** Increment the download count for the latest tracking scripts by 1. */
export async function incrementTrackingScriptDownloadCount(): Promise<void> {
	const latest = getLatestTrackingScript();
	if (!latest) return;

	await db
		.update(trackingScripts)
		.set({ downloadCount: sql`${trackingScripts.downloadCount} + 1` })
		.where(eq(trackingScripts.id, latest.id));

	if (latestTrackingScript) {
		latestTrackingScript = { ...latestTrackingScript, downloadCount: latestTrackingScript.downloadCount + 1 };
	}

	log.debug({ id: latest.id }, 'Incremented tracking scripts download count');
}

/** Increment the download count for a specific site pack by 1. */
export async function incrementSitePackDownloadCount(sitePackId: string): Promise<void> {
	await db
		.update(sitePack)
		.set({ downloadCount: sql`${sitePack.downloadCount} + 1` })
		.where(eq(sitePack.id, sitePackId));

	// Update the in-memory cache
	const cached = latestSitePacks.get(sitePackId);
	if (cached) {
		latestSitePacks.set(sitePackId, { ...cached, downloadCount: cached.downloadCount + 1 });
	}

	log.debug({ sitePackId }, 'Incremented site pack download count');
}
