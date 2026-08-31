import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { isProduction } from '$lib/env';
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
	DeleteFailed,
	InvalidArtifact
}

/** Maximum artifact upload size in bytes (100 MB). */
export const MAX_ARTIFACT_SIZE = 100 * 1024 * 1024;

/**
 * Version identifiers become CDN object path segments and are stored in the
 * DB. Only conservative, URL-safe identifiers are accepted: no slashes, no
 * backslashes, no traversal, no spaces or control characters.
 */
export const VERSION_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export function isValidArtifactVersion(version: string): boolean {
	return VERSION_PATTERN.test(version);
}

/**
 * Loose validation for human-readable artifact display names. Names never
 * become CDN path segments, so only a length cap and a control-character ban
 * apply — spaces, unicode, and punctuation are all fine.
 */
export function isValidArtifactName(name: string): boolean {
	return (
		typeof name === 'string' &&
		name.length > 0 &&
		name.length <= 200 &&
		!/[\u0000-\u001F\u007F]/.test(name)
	);
}

/** ZIP magic bytes: PK\x03\x04 (also matches empty zips — size is checked separately). */
const ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04];

/**
 * Validates an uploaded artifact file: non-empty, within the size cap, and
 * (for zip uploads) carrying the ZIP magic bytes.
 */
export async function isValidArtifactFile(
	file: File,
	options: { zip: boolean }
): Promise<boolean> {
	if (!file || file.size <= 0) return false;
	if (file.size > MAX_ARTIFACT_SIZE) return false;
	if (!options.zip) return true;

	// Read the first bytes without loading the whole file into memory.
	try {
		const head = await file.slice(0, 4).arrayBuffer();
		const bytes = new Uint8Array(head);
		return (
			bytes.length === ZIP_MAGIC.length &&
			ZIP_MAGIC.every((value, index) => bytes[index] === value)
		);
	} catch {
		return false;
	}
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
const storageZoneBase = new URL(
	`https://${env.BUNNY_CDN_BASE_URL}/${isProduction() ? '' : 'dev/'}`
);

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
	`https://storage.bunnycdn.com/${env.BUNNY_STORAGE_ZONE}/${isProduction() ? '' : 'dev/'}`
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
