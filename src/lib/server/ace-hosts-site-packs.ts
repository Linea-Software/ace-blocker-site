import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '$lib/server/logger';
import { uploadSitePack } from '$lib/server/cdn/upload';
import { getArrayBufferChecksum, MAX_SITE_PACK_SIZE } from '$lib/server/cdn/common';

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

export interface AceHostsSitePackSyncResult {
	release: string;
	updated: number;
	unchanged: number;
}

export interface AceHostsSitePackSyncStatus {
	running: boolean;
	lastStartedAt: string | null;
	lastCompletedAt: string | null;
	lastError: string | null;
	lastResult: AceHostsSitePackSyncResult | null;
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
		assetName: 'site-pack-adult-free.zip',
		requiresProSubscription: false
	},
	{
		id: 'pack-adult-pro',
		name: 'Adult Websites — Pro',
		description: 'Extended monthly adult-content list from ace-hosts.',
		assetName: 'site-pack-adult-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-social-free',
		name: 'Social Media Websites — Free',
		description: 'Blocks social media sites.',
		assetName: 'site-pack-social-free.zip',
		requiresProSubscription: false
	},
	{
		id: 'pack-gaming-free',
		name: 'Gaming Websites — Free',
		description: 'Blocks online gaming sites and services.',
		assetName: 'site-pack-gaming-free.zip',
		requiresProSubscription: false
	},
	{
		id: 'pack-gambling-pro',
		name: 'Gambling Websites — Pro',
		description: 'Blocks online gambling sites.',
		assetName: 'site-pack-gambling-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-streaming-pro',
		name: 'Streaming Websites — Pro',
		description: 'Blocks popular streaming services.',
		assetName: 'site-pack-streaming-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-shopping-pro',
		name: 'Shopping Websites — Pro',
		description: 'Blocks popular shopping services.',
		assetName: 'site-pack-shopping-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-anime-manga-pro',
		name: 'Anime & Manga Websites — Pro',
		description: 'Blocks anime and manga websites.',
		assetName: 'site-pack-anime-manga-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-anime-manga-extended',
		name: 'Anime & Manga Websites — Extended',
		description: 'Extended anime and manga website list.',
		assetName: 'site-pack-anime-manga-extended.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-forums-pro',
		name: 'Forums & Communities — Pro',
		description: 'Blocks forums and community websites.',
		assetName: 'site-pack-forums-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-news-pro',
		name: 'News Websites — Pro',
		description: 'Blocks news websites.',
		assetName: 'site-pack-news-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-sports-pro',
		name: 'Sports Websites — Pro',
		description: 'Blocks sports websites.',
		assetName: 'site-pack-sports-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-messaging-pro',
		name: 'Messaging Websites — Pro',
		description: 'Blocks messaging websites.',
		assetName: 'site-pack-messaging-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-ai-tools-pro',
		name: 'AI Tools Websites — Pro',
		description: 'Blocks AI tool websites.',
		assetName: 'site-pack-ai-tools-pro.zip',
		requiresProSubscription: true
	},
	{
		id: 'pack-dating-pro',
		name: 'Dating Websites — Pro',
		description: 'Blocks dating websites.',
		assetName: 'site-pack-dating-pro.zip',
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

async function getStoredSha256(id: string): Promise<string | null> {
	const rows = await db
		.select({ sha256: sitePack.sha256 })
		.from(sitePack)
		.where(eq(sitePack.id, id))
		.limit(1);
	return rows[0]?.sha256.toLowerCase() ?? null;
}

async function downloadVerifiedSitePack(
	asset: GitHubReleaseAsset,
	expectedSha256: string
): Promise<File> {
	if (asset.size > MAX_SITE_PACK_SIZE) {
		throw new Error(
			`ace-hosts asset ${asset.name} exceeds the 2 GiB site-pack limit (${asset.size} bytes)`
		);
	}

	const response = await fetch(asset.browser_download_url, {
		headers: { 'User-Agent': 'ace-blocker-site' }
	});
	if (!response.ok) {
		throw new Error(
			`ace-hosts asset ${asset.name} download failed with status ${response.status}`
		);
	}

	const body = await response.arrayBuffer();
	if (body.byteLength !== asset.size) {
		throw new Error(
			`ace-hosts asset ${asset.name} size mismatch: expected ${asset.size}, got ${body.byteLength}`
		);
	}

	const actualSha256 = getArrayBufferChecksum(body);
	if (actualSha256 !== expectedSha256) {
		throw new Error(
			`ace-hosts asset ${asset.name} checksum mismatch: expected ${expectedSha256}, got ${actualSha256}`
		);
	}

	return new File([body], asset.name, { type: 'application/zip' });
}

async function performAceHostsSitePackSync(): Promise<AceHostsSitePackSyncResult> {
	const release = await fetchLatestRelease();
	const checksums = await fetchChecksums(release);
	const updatedAt = new Date(release.published_at ?? release.created_at);
	if (Number.isNaN(updatedAt.getTime())) {
		throw new Error(`ace-hosts release ${release.tag_name} has an invalid publication date`);
	}

	let updated = 0;
	let unchanged = 0;

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

	for (const { definition, asset, sha256 } of resolvedPacks) {
		if ((await getStoredSha256(definition.id)) === sha256) {
			unchanged += 1;
			continue;
		}

		const file = await downloadVerifiedSitePack(asset, sha256);
		const upload = await uploadSitePack(
			file,
			definition.name,
			definition.id,
			definition.requiresProSubscription,
			true,
			updatedAt
		);
		if (upload.isErr()) {
			throw new Error(
				`failed to mirror ${definition.assetName} to BunnyCDN (error ${upload.error})`
			);
		}

		const uploaded = upload._unsafeUnwrap();
		if (uploaded.hash !== sha256) {
			throw new Error(
				`mirrored ${definition.assetName} checksum changed during upload: expected ${sha256}, got ${uploaded.hash}`
			);
		}
		updated += 1;
	}

	log.info(
		{ release: release.tag_name, updated, unchanged },
		'Synchronized site packs from ace-hosts'
	);
	return { release: release.tag_name, updated, unchanged };
}

let runningSync: Promise<AceHostsSitePackSyncResult> | null = null;
let lastStartedAt: string | null = null;
let lastCompletedAt: string | null = null;
let lastError: string | null = null;
let lastResult: AceHostsSitePackSyncResult | null = null;

export function getAceHostsSitePackSyncStatus(): AceHostsSitePackSyncStatus {
	return {
		running: runningSync !== null,
		lastStartedAt,
		lastCompletedAt,
		lastError,
		lastResult
	};
}

// Startup, the monthly timer and the admin button share one in-process run.
export function syncAceHostsSitePacks(): Promise<AceHostsSitePackSyncResult> {
	if (runningSync) return runningSync;

	lastStartedAt = new Date().toISOString();
	lastError = null;
	runningSync = performAceHostsSitePackSync()
		.then((result) => {
			lastResult = result;
			lastCompletedAt = new Date().toISOString();
			return result;
		})
		.catch((error: unknown) => {
			lastError = error instanceof Error ? error.message : 'Unknown synchronization error';
			lastCompletedAt = new Date().toISOString();
			throw error;
		})
		.finally(() => {
			runningSync = null;
		});
	return runningSync;
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
