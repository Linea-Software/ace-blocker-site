import { createHash } from 'node:crypto';
import { installersBasePath, installersUploadBase } from '$lib/server/cdn/common';
import {
	MAX_DESKTOP_MSI,
	DesktopReleaseError,
	expectedDesktopUrl
} from './desktop-update-security';

const STORAGE_ORIGIN = 'https://storage.bunnycdn.com/';
const OBJECT_TIMEOUT_MS = 10 * 60 * 1000;

function storageCredentials() {
	const zone = process.env.ACE_DESKTOP_STAGING_ZONE;
	const key = process.env.ACE_DESKTOP_STAGING_ACCESS_KEY;
	const publicKey = process.env.BUNNY_STORAGE_ACCESS_KEY;
	if (
		!zone ||
		!/^[A-Za-z0-9_-]{1,80}$/.test(zone) ||
		!key ||
		!publicKey ||
		!process.env.BUNNY_STORAGE_ZONE ||
		!process.env.BUNNY_CDN_BASE_URL
	)
		throw new DesktopReleaseError(
			'disabled',
			'Private staging and public Bunny storage are not configured'
		);
	if (zone === process.env.BUNNY_STORAGE_ZONE)
		throw new DesktopReleaseError(
			'disabled',
			'Staging must be a separate private storage zone'
		);
	return { zone, key, publicKey };
}

export function desktopStageKey(version: string, sha256: string): string {
	return `desktop-updates/${version}/${sha256}.msi`;
}

export function publishedObjectPath(version: string, sha256: string): string {
	return `signed/windows/x64/${version}/${sha256}.msi`;
}

export function publishedUrl(version: string, sha256: string): string {
	return expectedDesktopUrl(version, sha256, installersBasePath);
}

function stagedObjectUrl(key: string): URL {
	const { zone } = storageCredentials();
	return new URL(`${zone}/${key}`, STORAGE_ORIGIN);
}

function publicObjectUrl(version: string, sha256: string): URL {
	return new URL(publishedObjectPath(version, sha256), installersUploadBase);
}

async function fetchObject(
	url: URL,
	key: string,
	method: 'GET' | 'HEAD' = 'GET'
): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(url, {
			method,
			headers: { AccessKey: key },
			redirect: 'error',
			signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
		});
	} catch {
		throw new DesktopReleaseError('unavailable', 'Bunny storage is unreachable');
	}
	if (!response.ok)
		throw new DesktopReleaseError('unavailable', 'Bunny storage returned an error');
	return response;
}

export async function verifyStoredObject(
	location: 'staging' | 'public',
	version: string,
	sha256: string,
	expectedSize: number
): Promise<void> {
	const config = storageCredentials();
	const response =
		location === 'staging'
			? await fetchObject(stagedObjectUrl(desktopStageKey(version, sha256)), config.key)
			: await fetchObject(publicObjectUrl(version, sha256), config.publicKey);

	if (!response.body) throw new DesktopReleaseError('unavailable', 'Storage returned no body');
	const hasher = createHash('sha256');
	const msiMagic = Buffer.from('d0cf11e0a1b11ae1', 'hex');
	let firstBytes = Buffer.alloc(0);
	let size = 0;
	try {
		for await (const chunk of response.body) {
			size += chunk.byteLength;
			if (size > MAX_DESKTOP_MSI || size > expectedSize)
				throw new DesktopReleaseError('invalid', 'Stored MSI exceeds the declared size');
			if (firstBytes.length < msiMagic.length)
				firstBytes = Buffer.concat([
					firstBytes,
					chunk.subarray(0, msiMagic.length - firstBytes.length)
				]);
			hasher.update(chunk);
		}
	} catch (error) {
		if (error instanceof DesktopReleaseError) throw error;
		throw new DesktopReleaseError('unavailable', 'Failed to read Bunny storage object');
	}
	if (!firstBytes.equals(msiMagic))
		throw new DesktopReleaseError('invalid', 'Storage object is not an MSI compound file');
	if (size !== expectedSize || hasher.digest('hex') !== sha256)
		throw new DesktopReleaseError('invalid', 'Stored MSI integrity check failed');
}

/**
 * Copy through the VPS exactly once during admin publication, never for client downloads.
 * Both staging and public storage are verified before the feed can become visible.
 * No large ArrayBuffer allocations; Bun fetch uploads the source ReadableStream.
 */
export async function promoteDesktopObject(
	version: string,
	sha256: string,
	size: number
): Promise<void> {
	const config = storageCredentials();
	const url = publicObjectUrl(version, sha256);

	// Do not overwrite a historical content-addressed public asset.
	let head: Response;
	try {
		head = await fetch(url, {
			method: 'HEAD',
			headers: { AccessKey: config.publicKey },
			redirect: 'error',
			signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
		});
	} catch {
		throw new DesktopReleaseError('unavailable', 'Cannot check CDN destination');
	}
	if (head.status !== 404)
		throw new DesktopReleaseError(
			head.ok ? 'invalid' : 'unavailable',
			'Destination already exists or cannot be checked'
		);

	await verifyStoredObject('staging', version, sha256, size);
	const stage = await fetchObject(stagedObjectUrl(desktopStageKey(version, sha256)), config.key);
	if (!stage.body) throw new DesktopReleaseError('unavailable', 'Staging object has no body');
	let attemptedWrite = false;
	try {
		attemptedWrite = true; // the PUT may partially succeed even if fetch rejects
		const result = await fetch(url, {
			method: 'PUT',
			headers: {
				AccessKey: config.publicKey,
				Checksum: sha256,
				'Content-Type': 'application/octet-stream'
			},
			body: stage.body,
			duplex: 'half',
			redirect: 'error',
			signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
		} as RequestInit & { duplex: 'half' });
		if (!result.ok) throw new DesktopReleaseError('unavailable', 'Bunny promotion failed');
		await verifyStoredObject('public', version, sha256, size);
		await verifyAnonymousDesktopDownload(version, sha256, size);
	} catch (error) {
		if (attemptedWrite) {
			try {
				await fetch(url, {
					method: 'DELETE',
					headers: { AccessKey: config.publicKey },
					redirect: 'error',
					signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
				});
			} catch {
				/* orphan retained outside the public feed; alert operator */
			}
		}
		if (error instanceof DesktopReleaseError) throw error;
		throw new DesktopReleaseError('unavailable', 'Failed to promote MSI to CDN');
	}
}

/** Cleanup after a failed DB commit. Only the exact content-addressed path is eligible. */
export async function removePublishedDesktopObject(version: string, sha256: string): Promise<void> {
	const config = storageCredentials();
	try {
		const response = await fetch(publicObjectUrl(version, sha256), {
			method: 'DELETE',
			headers: { AccessKey: config.publicKey },
			redirect: 'error',
			signal: AbortSignal.timeout(OBJECT_TIMEOUT_MS)
		});
		if (!response.ok && response.status !== 404) throw new Error('CDN removal failed');
	} catch {
		throw new DesktopReleaseError('unavailable', 'Could not remove incompletely published MSI');
	}
}

/** The updater has no credentials: prove the final pull-zone URL is public before approval. */
export async function verifyAnonymousDesktopDownload(
	version: string,
	sha256: string,
	size: number
): Promise<void> {
	let response: Response;
	try {
		response = await fetch(publishedUrl(version, sha256), {
			method: 'HEAD',
			redirect: 'error',
			signal: AbortSignal.timeout(15000)
		});
	} catch {
		throw new DesktopReleaseError('unavailable', 'Public CDN is not reachable anonymously');
	}
	if (!response.ok)
		throw new DesktopReleaseError(
			'unavailable',
			'Public CDN requires authentication or is unavailable'
		);
	const length = response.headers.get('content-length');
	if (length && Number(length) !== size)
		throw new DesktopReleaseError(
			'invalid',
			'Anonymous CDN response length mismatches verified MSI'
		);
}
