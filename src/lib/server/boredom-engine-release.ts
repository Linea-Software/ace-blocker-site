import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { resistanceModeScripts } from '$lib/server/db/schema';
import {
	isValidArtifactFile,
	MAX_ARTIFACT_SIZE,
	uploadResistanceModeScript
} from '$lib/server/cdn';
import { createLogger } from '$lib/server/logger';

const log = createLogger('boredom-engine-release');
const RELEASE_API = 'https://api.github.com/repos/Linea-Software/boredom-engine/releases/latest';
const RELEASE_DOWNLOAD_BASE = 'https://github.com/Linea-Software/boredom-engine/releases/download/';
const ARCHIVE_NAME = 'resistance-scripts.zip';
const CHECKSUM_NAME = 'sha256_checksums.txt';
const CHECKSUM_LIMIT = 64 * 1024;
const RELEASE_TAG_PATTERN = /^v([0-9]+\.[0-9]+\.[0-9]+)$/;

interface GitHubAsset {
	name: string;
	size: number;
	browser_download_url: string;
	digest?: string | null;
}

interface GitHubRelease {
	tag_name: string;
	draft: boolean;
	prerelease: boolean;
	assets: GitHubAsset[];
}

export interface BoredomEngineImportResult {
	release: string;
	version: string;
	sha256: string;
	imported: boolean;
}

export interface BoredomEngineImportStatus {
	running: boolean;
	lastStartedAt: string | null;
	lastCompletedAt: string | null;
	lastError: string | null;
	lastResult: BoredomEngineImportResult | null;
}

function expectedDownloadUrl(tag: string, name: string): string {
	return `${RELEASE_DOWNLOAD_BASE}${tag}/${name}`;
}

function releaseAsset(release: GitHubRelease, name: string): GitHubAsset | null {
	const asset = release.assets.find((item) => item.name === name);
	if (!asset) return null;
	// Asset URLs are supplied by an external API: never fetch an arbitrary URL.
	if (asset.browser_download_url !== expectedDownloadUrl(release.tag_name, name)) {
		throw new Error(`Unexpected GitHub asset URL for ${name}`);
	}
	if (!Number.isSafeInteger(asset.size) || asset.size <= 0) {
		throw new Error(`Invalid GitHub asset size for ${name}`);
	}
	return asset;
}

async function fetchRelease(): Promise<GitHubRelease> {
	const response = await fetch(RELEASE_API, {
		headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'ace-blocker-site' },
		signal: AbortSignal.timeout(30_000)
	});
	if (!response.ok) {
		throw new Error(`GitHub latest release request failed (HTTP ${response.status})`);
	}

	const release = (await response.json()) as GitHubRelease;
	if (
		!release ||
		typeof release.tag_name !== 'string' ||
		!RELEASE_TAG_PATTERN.test(release.tag_name) ||
		release.draft ||
		release.prerelease ||
		!Array.isArray(release.assets)
	) {
		throw new Error('GitHub latest release is not a supported stable Boredom Engine release');
	}
	return release;
}

async function downloadBounded(
	url: string,
	maximumBytes: number
): Promise<{ chunks: Uint8Array<ArrayBuffer>[]; size: number; sha256: string }> {
	const response = await fetch(url, {
		headers: { 'User-Agent': 'ace-blocker-site' },
		signal: AbortSignal.timeout(120_000)
	});
	if (!response.ok || !response.body) {
		throw new Error(`GitHub asset download failed (HTTP ${response.status})`);
	}
	const advertisedSize = response.headers.get('content-length');
	if (advertisedSize && Number(advertisedSize) > maximumBytes) {
		await response.body.cancel();
		throw new Error('GitHub asset exceeds the allowed download size');
	}

	const reader = response.body.getReader();
	const chunks: Uint8Array<ArrayBuffer>[] = [];
	const digest = createHash('sha256');
	let size = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			size += value.byteLength;
			if (size > maximumBytes)
				throw new Error('GitHub asset exceeds the allowed download size');
			const chunk = new Uint8Array(value);
			digest.update(chunk);
			chunks.push(chunk);
		}
	} catch (error) {
		await reader.cancel().catch(() => undefined);
		throw error;
	} finally {
		reader.releaseLock();
	}
	if (size === 0) throw new Error('GitHub asset is empty');
	return { chunks, size, sha256: digest.digest('hex') };
}

function checksumForAsset(text: string, name: string): string | null {
	for (const line of text.split(/\r?\n/)) {
		const match = line.trim().match(/^([0-9a-fA-F]{64})\s+\*?([^\s]+)$/);
		if (match?.[2] === name) return match[1].toLowerCase();
	}
	return null;
}

async function expectedChecksum(release: GitHubRelease, archive: GitHubAsset): Promise<string> {
	const nativeDigest = archive.digest?.match(/^sha256:([0-9a-fA-F]{64})$/)?.[1]?.toLowerCase();
	const checksums = releaseAsset(release, CHECKSUM_NAME);
	if (!checksums && !nativeDigest) {
		throw new Error('GitHub release has no SHA-256 checksum for the resistance archive');
	}
	if (!checksums) return nativeDigest!;

	if (checksums.size > CHECKSUM_LIMIT) throw new Error('GitHub checksum file is too large');
	const downloaded = await downloadBounded(checksums.browser_download_url, CHECKSUM_LIMIT);
	if (downloaded.size !== checksums.size) throw new Error('GitHub checksum file size mismatch');
	const text = await new Blob(downloaded.chunks).text();
	const checksum = checksumForAsset(text, ARCHIVE_NAME);
	if (!checksum) throw new Error('GitHub checksum file has no resistance archive entry');
	if (nativeDigest && nativeDigest !== checksum) {
		throw new Error('GitHub asset digest differs from the published SHA-256 checksum');
	}
	return checksum;
}

async function storedRelease(version: string) {
	return db.query.resistanceModeScripts.findFirst({
		where: eq(resistanceModeScripts.version, version)
	});
}

async function performImport(): Promise<BoredomEngineImportResult> {
	const release = await fetchRelease();
	const version = release.tag_name.match(RELEASE_TAG_PATTERN)![1];
	const archive = releaseAsset(release, ARCHIVE_NAME);
	if (!archive) throw new Error(`GitHub release ${release.tag_name} has no ${ARCHIVE_NAME}`);
	if (archive.size > MAX_ARTIFACT_SIZE) {
		throw new Error('GitHub resistance archive exceeds the 100 MiB size limit');
	}

	const sha256 = await expectedChecksum(release, archive);
	const existing = await storedRelease(version);
	if (existing) {
		if (existing.sha256.toLowerCase() !== sha256) {
			throw new Error(`Version ${version} already exists with a different SHA-256`);
		}
		return { release: release.tag_name, version, sha256, imported: false };
	}

	const downloaded = await downloadBounded(archive.browser_download_url, MAX_ARTIFACT_SIZE);
	if (downloaded.size !== archive.size)
		throw new Error('GitHub resistance archive size mismatch');
	if (downloaded.sha256 !== sha256) throw new Error('GitHub resistance archive SHA-256 mismatch');

	const file = new File(downloaded.chunks, ARCHIVE_NAME, { type: 'application/zip' });
	if (!(await isValidArtifactFile(file, { zip: true }))) {
		throw new Error('GitHub resistance artifact is not a valid ZIP');
	}

	// Never overwrite an existing immutable version after a concurrent import.
	const concurrent = await storedRelease(version);
	if (concurrent) {
		if (concurrent.sha256.toLowerCase() !== sha256) {
			throw new Error(`Version ${version} already exists with a different SHA-256`);
		}
		return { release: release.tag_name, version, sha256, imported: false };
	}

	// The existing CDN uploader persists version/hash/size and invalidates caches.
	const upload = await uploadResistanceModeScript(file, version, false);
	if (upload.isErr()) {
		throw new Error(`Failed to stage Boredom Engine archive (CDN error ${upload.error})`);
	}
	if (upload._unsafeUnwrap().hash !== sha256) {
		throw new Error('Mirrored resistance archive checksum differs from the GitHub release');
	}

	log.info(
		{ release: release.tag_name, version, sha256 },
		'Staged Boredom Engine GitHub release'
	);
	return { release: release.tag_name, version, sha256, imported: true };
}

let runningImport: Promise<BoredomEngineImportResult> | null = null;
let lastStartedAt: string | null = null;
let lastCompletedAt: string | null = null;
let lastError: string | null = null;
let lastResult: BoredomEngineImportResult | null = null;

export function getBoredomEngineImportStatus(): BoredomEngineImportStatus {
	return {
		running: runningImport !== null,
		lastStartedAt,
		lastCompletedAt,
		lastError,
		lastResult
	};
}

export function importBoredomEngineRelease(): Promise<BoredomEngineImportResult> {
	if (runningImport) return runningImport;
	lastStartedAt = new Date().toISOString();
	lastError = null;
	runningImport = performImport()
		.then((result) => {
			lastResult = result;
			lastCompletedAt = new Date().toISOString();
			return result;
		})
		.catch((error: unknown) => {
			lastError = error instanceof Error ? error.message : 'Unknown GitHub import error';
			lastCompletedAt = new Date().toISOString();
			log.error({ err: error }, 'Failed to import Boredom Engine release from GitHub');
			throw error;
		})
		.finally(() => {
			runningImport = null;
		});
	return runningImport;
}
