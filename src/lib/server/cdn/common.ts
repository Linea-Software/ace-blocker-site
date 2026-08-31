import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { isProduction } from '$lib/server/env';
import { createLogger } from '$lib/server/logger';

const log = createLogger('cdn');

export enum CDNObjectPath {
	Installer = 'ace-blocker-installer',
	ResistanceModeScripts = 'resistance-mode-scripts',
	SitePacks = 'site-packs',
	TrackingScripts = 'tracking-scripts'
}

export enum CDNErrorType {
	ProSubscriptionRequired,
	SitePackNotFound,
	NoReleaseAvailable,
	UploadFailed,
	NetworkFailure,
	DeleteFailed
}

if (!env.BUNNY_URL_TOKEN_AUTH_KEY) {
	throw Error('❌ BUNNY_URL_TOKEN_AUTH_KEY is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ZONE) {
	throw Error('❌ BUNNY_STORAGE_ZONE is missing in environment variables');
}

if (!env.BUNNY_CDN_BASE_URL) {
	throw Error('❌ BUNNY_CDN_BASE_URL is missing in environment variables');
}

if (!env.BUNNY_STORAGE_ACCESS_KEY) {
	throw Error('❌ BUNNY_STORAGE_ACCESS_KEY is missing in environment variables');
}

const securityKey = env.BUNNY_URL_TOKEN_AUTH_KEY;

// === Base paths/URLs declarations === //

// In production, files are served from the root. In dev, use /dev/ prefix.
// Trailing slash is required so that new URL(relative, base) appends rather than replaces the last segment.
const storageZoneBase = new URL(`https://${env.BUNNY_CDN_BASE_URL}/${isProduction ? '' : 'dev/'}`);

export const sitePacksBasePath = new URL(CDNObjectPath.SitePacks + '/', storageZoneBase);
export const resistanceModeScriptBasePath = new URL(
	CDNObjectPath.ResistanceModeScripts + '/',
	storageZoneBase
);
export const trackingScriptsBasePath = new URL(
	CDNObjectPath.TrackingScripts + '/',
	storageZoneBase
);
export const installersBasePath = new URL(CDNObjectPath.Installer + '/', storageZoneBase);

// === Upload base paths === //
const bunnyUploadBase = new URL(
	`https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}/${isProduction ? '' : 'dev/'}`
);

log.info({ url: bunnyUploadBase.toString() }, 'Bunny upload base URL configured');

export const trackingScriptsUploadBase = new URL(
	CDNObjectPath.TrackingScripts + '/',
	bunnyUploadBase
);
export const sitePacksUploadBase = new URL(CDNObjectPath.SitePacks + '/', bunnyUploadBase);
export const resistanceModeScriptsUploadBase = new URL(
	CDNObjectPath.ResistanceModeScripts + '/',
	bunnyUploadBase
);
export const installersUploadBase = new URL(CDNObjectPath.Installer + '/', bunnyUploadBase);

export const trackingScriptsFileName = 'tracking-scripts.zip';
export const resistanceModeScriptsFileName = 'resistance-mode-scripts.zip';

// === Token generator === //
/**
 * Generate a BunnyCDN token-authentication token (Basic Token Authentication,
 * https://bunny.net/docs/cdn/security/token-authentication/basic):
 *
 *   token = base64url( HMAC-SHA256( securityKey, path + expiration ) )
 *
 * and append it to the URL as `?token=...&expires=<unix seconds>`.
 * The signed path must be the exact request path (no query string).
 */
export function generateBunnyCDNToken(path: string, expiration: number): string {
	const hashableBase = path + expiration;

	const token = crypto
		.createHmac('sha256', securityKey)
		.update(hashableBase)
		.digest('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/g, '');

	return token;
}

// === Utilities === //
export function getArrayBufferChecksum(arrayBuffer: ArrayBuffer): string {
	const buffer = Buffer.from(arrayBuffer);
	return crypto.createHash('sha256').update(buffer).digest('hex');
}
