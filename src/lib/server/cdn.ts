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
const storageZoneBase = new URL(`https://${env.BUNNY_STORAGE_ZONE}`);

const siteListsBasePath = dev ? '/dev' : '' + CDNObjectPath.SiteLists;
const resistanceModeScriptBasePath = dev ? '/dev' : '' + CDNObjectPath.ResistanceModeScripts;

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
): Result<string, CDNErrorType> {
	const cache = getLatestSiteLists();

	const latestRecord = cache.get(siteListUuid);

	if (!latestRecord) {
		return err(CDNErrorType.SiteListNotFound);
	}

	let siteListPath = siteListsBasePath + '/' + latestRecord.fileName;

	if (latestRecord.requiresProSubscription) {
		if (!isUserPro) {
			return err(CDNErrorType.ProSubscriptionRequired);
		}

		// We're generating a token to ensure that only pro members can access it (hopefully)
		const expiration = Math.round(Date.now() / 1000) + 600; // 5 minutes
		const token = generateBunnyCDNToken(siteListPath, expiration);

		siteListPath += `?token=${token}&expires=${expiration}`;
	}

	return ok(storageZoneBase + siteListPath);
}

export function getResistanceModeScriptsURL(): Result<
	{ url: string; version: string },
	CDNErrorType
> {
	const latestRecord = getLatestResistanceScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let resistanceScriptsPath = `${resistanceModeScriptBasePath}/${latestRecord.version}/${latestRecord.fileName}`;

	const expiration = Math.round(Date.now() / 1000) + 600;
	const token = generateBunnyCDNToken(resistanceScriptsPath, expiration);

	resistanceScriptsPath += `?token=${token}&expires=${expiration}`;

	return ok({ url: storageZoneBase + resistanceScriptsPath, version: latestRecord.version });
}
