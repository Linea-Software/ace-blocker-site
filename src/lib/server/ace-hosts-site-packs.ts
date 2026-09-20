import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { invalidateSitePacksCache } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';

const log = createLogger('ace-hosts-site-packs');
const ACE_HOSTS_RELEASE_API =
	'https://api.github.com/repos/Linea-Software/ace-hosts/releases/latest';
const MAX_TIMER_DELAY_MS = 24 * 24 * 60 * 60 * 1000;

interface GitHubReleaseAsset {
	name: string;
	size: number;
	browser_download_url: string;
	digest?: string | null;
}

interface GitHubRelease {
	tag_name: string;
	published_at: string | null;
	created_at: string;
	assets: GitHubReleaseAsset[];
}

export interface AceHostsSitePackDefinition {
	id: string;
	name: string;
	description: string;
	assetName: string;
	requiresProSubscription: boolean;
}

export const ACE_HOSTS_SITE_PACKS: readonly AceHostsSitePackDefinition[] = [
	{
		id: 'pack-adult-free',
		name: 'Adult Websites — Free',
		description: 'Compact monthly adult-content list from ace-hosts.',
		assetName: 'adult-hosts00',
		requiresProSubscription: false
	},
	{
		id: 'pack-adult-pro',
		name: 'Adult Websites — Pro',
		description: 'Extended monthly adult-content list from ace-hosts.',
		assetName: 'adult-extended.txt',
		requiresProSubscription: true
	},
	{
		id: 'pack-social-free',
		name: 'Social Media Websites — Free',
		description: 'Blocks social media sites.',
		assetName: 'social-hosts00',
		requiresProSubscription: false
	},
	{
		id: 'pack-gaming-free',
		name: 'Gaming Websites — Free',
		description: 'Blocks online gaming sites and services.',
		assetName: 'gaming-hosts00',
		requiresProSubscription: false
	},
	{
		id: 'pack-gambling-pro',
		name: 'Gambling Websites — Pro',
		description: 'Blocks online gambling sites.',
		assetName: 'gambling-hosts00',
		requiresProSubscription: true
	},
	{
		id: 'pack-streaming-pro',
		name: 'Streaming Websites — Pro',
		description: 'Blocks popular streaming services.',
		assetName: 'streaming-hosts00',
		requiresProSubscription: true
	},
	{
		id: 'pack-shopping-pro',
		name: 'Shopping Websites — Pro',
		description: 'Blocks popular shopping services.',
		assetName: 'shopping-hosts00',
		requiresProSubscription: true
	}
];

function sha256FromAsset(
	asset: GitHubReleaseAsset,
	checksums: ReadonlyMap<string, string>
): string | null {
	const digest = asset.digest?.match(/^sha256:([a-f0-9]{64})$/i)?.[1];
	return digest?.toLowerCase() ?? checksums.get(asset.name) ?? null;
}

export function parseSha256Checksums(contents: string): Map<string, string> {
	const checksums = new Map<string, string>();
	for (const line of contents.split(/\r?\n/)) {
		const match = line.trim().match(/^([a-f0-9]{64})\s+\*?(.+)$/i);
		if (match) checksums.set(match[2], match[1].toLowerCase());
	}
	return checksums;
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
	const response = await fetch(ACE_HOSTS_RELEASE_API, {
		headers: {
			Accept: 'application/vnd.github+json',
			'User-Agent': 'ace-blocker-site'
		}
	});
	if (!response.ok) {
		throw new Error(`GitHub release request failed with status ${response.status}`);
	}
	return (await response.json()) as GitHubRelease;
}

async function fetchChecksums(release: GitHubRelease): Promise<Map<string, string>> {
	const checksumAsset = release.assets.find((asset) => asset.name === 'sha256_checksums.txt');
	if (!checksumAsset) return new Map();

	const response = await fetch(checksumAsset.browser_download_url, {
		headers: { 'User-Agent': 'ace-blocker-site' }
	});
	if (!response.ok) {
		throw new Error(`ace-hosts checksum download failed with status ${response.status}`);
	}
	return parseSha256Checksums(await response.text());
}

export async function syncAceHostsSitePacks(): Promise<void> {
	const release = await fetchLatestRelease();
	const checksums = await fetchChecksums(release);
	const updatedAt = new Date(release.published_at ?? release.created_at);

	const resolvedPacks = ACE_HOSTS_SITE_PACKS.map((definition) => {
		const asset = release.assets.find((candidate) => candidate.name === definition.assetName);
		if (!asset) {
			throw new Error(
				`ace-hosts release ${release.tag_name} is missing required asset ${definition.assetName}`
			);
		}

		const sha256 = sha256FromAsset(asset, checksums);
		if (!sha256) {
			throw new Error(
				`ace-hosts release ${release.tag_name} has no SHA-256 for ${definition.assetName}`
			);
		}

		return { definition, asset, sha256 };
	});

	await db.transaction(async (tx) => {
		for (const { definition, asset, sha256 } of resolvedPacks) {
			await tx
				.insert(sitePack)
				.values({
					id: definition.id,
					name: definition.name,
					fileName: asset.name,
					requiresProSubscription: definition.requiresProSubscription,
					downloadUrl: asset.browser_download_url,
					updatedAt,
					sha256,
					size: asset.size,
					canBeDownloaded: true,
					downloadCount: 0
				})
				.onConflictDoUpdate({
					target: sitePack.id,
					set: {
						name: definition.name,
						fileName: asset.name,
						requiresProSubscription: definition.requiresProSubscription,
						downloadUrl: asset.browser_download_url,
						updatedAt,
						sha256,
						size: asset.size,
						canBeDownloaded: true
					}
				});
		}
	});
	await invalidateSitePacksCache();
	log.info(
		{ release: release.tag_name, count: ACE_HOSTS_SITE_PACKS.length },
		'Synchronized site packs from ace-hosts'
	);
}

let monthlySyncTimer: ReturnType<typeof setTimeout> | null = null;

export function millisecondsUntilNextAceHostsSync(now: Date = new Date()): number {
	const nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2, 4, 0, 0));
	return Math.max(0, nextRun.getTime() - now.getTime());
}

export function startAceHostsSitePackSync(): void {
	if (monthlySyncTimer) return;

	const remainingDelay = millisecondsUntilNextAceHostsSync();
	const timerDelay = Math.min(remainingDelay, MAX_TIMER_DELAY_MS);
	monthlySyncTimer = setTimeout(() => {
		monthlySyncTimer = null;
		if (remainingDelay > MAX_TIMER_DELAY_MS) {
			startAceHostsSitePackSync();
			return;
		}

		void syncAceHostsSitePacks()
			.catch((error) => {
				log.error({ err: error }, 'Monthly ace-hosts site-pack synchronization failed');
			})
			.finally(() => startAceHostsSitePackSync());
	}, timerDelay);
}
