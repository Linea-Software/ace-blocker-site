import { err, ok, Result } from 'neverthrow';
import {
	getLatestSitePacks,
	getLatestResistanceScript,
	getLatestTrackingScript,
	getLatestInstaller
} from '$lib/server/cache';
import {
	CDNErrorType,
	sitePacksBasePath,
	resistanceModeScriptBasePath,
	trackingScriptsBasePath,
	installersBasePath,
	generateBunnyCDNToken
} from './common';

export function getSitePackURL(
	sitePackUuid: string,
	isUserPro: boolean
): Result<URL, CDNErrorType> {
	const cache = getLatestSitePacks();

	const latestRecord = cache.get(sitePackUuid);

	if (!latestRecord) {
		return err(CDNErrorType.SitePackNotFound);
	}

	let sitePackPath = new URL(latestRecord.fileName, sitePacksBasePath);

	if (latestRecord.requiresProSubscription) {
		if (!isUserPro) {
			return err(CDNErrorType.ProSubscriptionRequired);
		}

		// We're generating a token to ensure that only pro members can access it (hopefully)
		const expiration = Math.round(Date.now() / 1000) + 600; // 10 minutes
		const token = generateBunnyCDNToken(sitePackPath.pathname, expiration);

		// BunnyCDN reads the expiry from `expires`, not `expiration`.
		sitePackPath.searchParams.append('token', token);
		sitePackPath.searchParams.append('expires', expiration.toString());
	}

	return ok(sitePackPath);
}

export function getResistanceModeScriptsURL(): Result<
	{ url: URL; version: string; sha256: string },
	CDNErrorType
> {
	const latestRecord = getLatestResistanceScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let resistanceScriptsPath = new URL(
		`${latestRecord.version}/${latestRecord.fileName}`,
		resistanceModeScriptBasePath
	);

	const expiration = Math.round(Date.now() / 1000) + 600; // 10 minutes
	const token = generateBunnyCDNToken(resistanceScriptsPath.pathname, expiration);

	// BunnyCDN reads the expiry from `expires`.
	resistanceScriptsPath.searchParams.append('token', token);
	resistanceScriptsPath.searchParams.append('expires', expiration.toString());

	return ok({
		url: resistanceScriptsPath,
		version: latestRecord.version,
		sha256: latestRecord.sha256
	});
}

export function getTrackingScriptsURL(): Result<
	{ url: URL; version: string; sha256: string },
	CDNErrorType
> {
	const latestRecord = getLatestTrackingScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let trackingScriptsPath = new URL(
		`${latestRecord.version}/${latestRecord.fileName}`,
		trackingScriptsBasePath
	);

	// No auth token needed for tracking scripts (publicly accessible)

	return ok({
		url: trackingScriptsPath,
		version: latestRecord.version,
		sha256: latestRecord.sha256
	});
}

export function getInstallerURL(
	os: 'windows' | 'linux' | 'macos',
	architecture: 'x64' | 'arm64'
): Result<{ url: URL; version: string }, CDNErrorType> {
	const latestRecord = getLatestInstaller();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let installerPath = new URL(
		`${latestRecord.version}/${latestRecord.os}/${latestRecord.architecture}/${latestRecord.fileName}`,
		installersBasePath
	);

	// No auth token needed for installers (publicly accessible)

	return ok({ url: installerPath, version: latestRecord.version });
}
