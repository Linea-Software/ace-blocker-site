import { env } from '$env/dynamic/private';
import { err, ok, Result } from 'neverthrow';
import {
	getLatestSiteLists,
	getLatestResistanceScript,
	invalidateTrackingCache
} from '$lib/server/cache';
import { dev } from '$app/environment';
import crypto from 'crypto';
import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';

export enum CDNObjectPath {
	Installer = '/ace-blocker-installer',
	ResistanceModeScripts = '/resistance-mode-scripts',
	SiteLists = '/site-lists',
	TrackingScripts = '/tracking-scripts'
}

export enum CDNErrorType {
	ProSubscriptionRequired,
	SiteListNotFound,
	NoReleaseAvailable,
	UploadFailed,
	NetworkFailure
}

if (!env.BUNNY_SECURITY_KEY) {
	throw Error('❌ BUNNY_SECURITY_KEY is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ZONE) {
	throw Error('❌ BUNNY_STORAGE_ZONE is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ACCESS_KEY) {
	throw Error('❌ BUNNY_STORAGE_ACCESS_KEY is missing in environment variables');
}

const securityKey = env.BUNNY_SECURITY_KEY;

// === Base paths/URLs declarations === //

// on dev mode we're going with /dev
const storageZoneBase = new URL(`https://${env.BUNNY_STORAGE_ZONE}` + dev ? '/dev' : '');

const siteListsBasePath = new URL(CDNObjectPath.SiteLists, storageZoneBase);
const resistanceModeScriptBasePath = new URL(CDNObjectPath.ResistanceModeScripts, storageZoneBase);
const trackingScriptsBasePath = new URL(CDNObjectPath.TrackingScripts, storageZoneBase);

// === Token generator === //
function generateBunnyCDNToken(path: string, expiration: number): string {
	const hashableBase = securityKey + path + expiration;

	const token = crypto
		.createHash('sha256')
		.update(hashableBase)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=/g, '');

	return token;
}

export function getSiteListURL(
	siteListUuid: string,
	isUserPro: boolean
): Result<URL, CDNErrorType> {
	const cache = getLatestSiteLists();

	const latestRecord = cache.get(siteListUuid);

	if (!latestRecord) {
		return err(CDNErrorType.SiteListNotFound);
	}

	let siteListPath = new URL('/' + latestRecord.fileName, siteListsBasePath);

	if (latestRecord.requiresProSubscription) {
		if (!isUserPro) {
			return err(CDNErrorType.ProSubscriptionRequired);
		}

		// We're generating a token to ensure that only pro members can access it (hopefully)
		const expiration = Math.round(Date.now() / 1000) + 600; // 5 minutes
		const token = generateBunnyCDNToken(siteListPath.pathname, expiration);

		// `?token=${token}&expires=${expiration}`
		siteListPath.searchParams.append('token', token);
		siteListPath.searchParams.append('expiration', expiration.toString());
	}

	return ok(siteListPath);
}

export function getResistanceModeScriptsURL(): Result<{ url: URL; version: string }, CDNErrorType> {
	const latestRecord = getLatestResistanceScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let resistanceScriptsPath = new URL(
		`/${latestRecord.version}/${latestRecord.fileName}`,
		resistanceModeScriptBasePath
	);

	const expiration = Math.round(Date.now() / 1000) + 600;
	const token = generateBunnyCDNToken(resistanceScriptsPath.pathname, expiration);

	//`?token=${token}&expires=${expiration}`;
	resistanceScriptsPath.searchParams.append('token', token);
	resistanceScriptsPath.searchParams.append('expiration', expiration.toString());

	return ok({ url: resistanceScriptsPath, version: latestRecord.version });
}

// === Upload functions === //
const bunnyUploadBase = new URL(
	`https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}` + dev ? '/dev' : ''
);

const trackingScriptsUploadBase = new URL(CDNObjectPath.TrackingScripts, bunnyUploadBase);

const trackingScriptsFileName = 'tracking-scripts.zip';

// Thank god that arrayBuffer doesn't get cloned, or else immagine the RAM cost
function getArrayBufferChecksum(arrayBuffer: ArrayBuffer): string {
	const buffer = Buffer.from(arrayBuffer);
	return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function uploadFileToBunnyCDN(
	file: File,
	endpointUrl: URL
): Promise<Result<{ hash: string }, CDNErrorType>> {
	const arrayBuffer = await file.arrayBuffer();
	const hash = getArrayBufferChecksum(arrayBuffer);

	try {
		const response = await fetch(endpointUrl, {
			method: 'PUT',
			headers: {
				AccessKey: env.BUNNY_STORAGE_ACCESS_KEY,
				Checksum: hash,
				'Content-Type': 'application/octet-stream'
			},
			body: arrayBuffer
		});

		if (!response.ok) {
			console.error('Unable to upload the file to BunnyCDN:\n' + response);
			return err(CDNErrorType.UploadFailed);
		}

		return ok({ hash: hash });
	} catch (error) {
		console.error('Network failure during BunnyCDN file upload:\n' + error);
		return err(CDNErrorType.NetworkFailure);
	}
}

export async function uploadTrackingScripts(
	file: File,
	version: string,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const endpointUrl = new URL(
		`/${version}/${trackingScriptsFileName}`,
		trackingScriptsUploadBase
	);

	const uploadResult = await uploadFileToBunnyCDN(
		file,
		new URL(endpointUrl, trackingScriptsUploadBase)
	);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, trackingScriptsBasePath).toString();

	await db.insert(trackingScripts).values({
		id: crypto.randomUUID(),
		fileName: file.name,
		version,
		downloadUrl,
		sha256: hash,
		size: file.size,
		canBeDownloaded: canBeDownloaded,
		downloadCount: 0
	});

	await invalidateTrackingCache();

	return ok({ downloadUrl, hash });
}
