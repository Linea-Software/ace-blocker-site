import { env } from '$env/dynamic/private';
import { err, ok, Result } from 'neverthrow';
import { getLatestSiteLists } from './api/cache';
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
	SiteListNotFound
}

if (!env.BUNNY_SECURITY_KEY) {
	throw Error('❌ BUNNY_SECURITY_KEY is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ZONE) {
	throw Error('❌ BUNNY_STORAGE_ZONE is missing in environment variables');
}

const securityKey = env.BUNNY_SECURITY_KEY;
const storageZoneBase = new URL(`https://${env.BUNNY_STORAGE_ZONE}`);

const siteListsBasePath = dev ? `/dev${CDNObjectPath.SiteLists}` : CDNObjectPath.SiteLists;

export function getSiteListPath(
	siteListUuid: string,
	isUserPro: boolean
): Result<URL, CDNErrorType> {
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
		const expires = Math.round(Date.now() / 1000) + 600; // 5 minutes
		const hashableBase = securityKey + siteListPath + expires;

		const token = crypto
			.createHash('sha256')
			.update(hashableBase)
			.digest('base64')
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');

		siteListPath += `?token=${token}&expires=${expires}`;
	}

	return ok(new URL(siteListPath, storageZoneBase));
}
