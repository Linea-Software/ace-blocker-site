import { env } from '$env/dynamic/private';
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
	NoReleaseAvailable,
	UploadFailed,
	NetworkFailure,
	DeleteFailed
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

export const siteListsBasePath = new URL(CDNObjectPath.SiteLists, storageZoneBase);
export const resistanceModeScriptBasePath = new URL(
	CDNObjectPath.ResistanceModeScripts,
	storageZoneBase
);
export const trackingScriptsBasePath = new URL(CDNObjectPath.TrackingScripts, storageZoneBase);

// === Upload base paths === //
const bunnyUploadBase = new URL(
	`https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}` + dev ? '/dev' : ''
);

export const trackingScriptsUploadBase = new URL(CDNObjectPath.TrackingScripts, bunnyUploadBase);

export const trackingScriptsFileName = 'tracking-scripts.zip';

// === Token generator === //
export function generateBunnyCDNToken(path: string, expiration: number): string {
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

// === Utilities === //
export function getArrayBufferChecksum(arrayBuffer: ArrayBuffer): string {
	const buffer = Buffer.from(arrayBuffer);
	return crypto.createHash('sha256').update(buffer).digest('hex');
}
