import { env } from '$env/dynamic/private';
import { err, ok, Result } from 'neverthrow';
import { getLatestSiteLists, getLatestResistanceScript } from '$lib/server/cache';
import { dev } from '$app/environment';
import crypto from 'crypto';

export enum CDNObjectPath {
	Installer = '/ace-blocker-installer',
	ResistanceModeScripts = '/resistance-mode-scripts',
	SiteLists = '/site-lists',
	TrackingScripts = '/tracking-scripts'
}

export enum CDNErrorType {
	ProSubscriptionRequired,
	SiteListNotFound,
	NoReleaseAvailable
}

if (!env.BUNNY_SECURITY_KEY) {
	throw Error('❌ BUNNY_SECURITY_KEY is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ZONE) {
	throw Error('❌ BUNNY_STORAGE_ZONE is missing in environment variables');
}

const securityKey = env.BUNNY_SECURITY_KEY;

// === Base paths/URLs declarations === //

// on dev mode we're going with /dev
const storageZoneBase = new URL(`https://${env.BUNNY_STORAGE_ZONE}` + dev ? '/dev' : '');
const bunnyUploadBase = new URL(
	`https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}` + dev ? '/dev' : ''
);

const siteListsBasePath = new URL(CDNObjectPath.SiteLists, storageZoneBase);
const resistanceModeScriptBasePath = new URL(CDNObjectPath.ResistanceModeScripts, storageZoneBase);

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
