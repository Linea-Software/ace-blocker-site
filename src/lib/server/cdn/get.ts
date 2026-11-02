import { err, ok, Result } from 'neverthrow';
import { getLatestSitePacks, getLatestResistanceScript, getInstallerFor } from '$lib/server/cache';
import {
	CDNErrorType,
	sitePacksBasePath,
	resistanceModeScriptBasePath,
	installersBasePath,
	generateBunnyCDNToken,
	isBunnyCdnConfigured
} from './common';

export function getSitePackURL(
	sitePackUuid: string,
	isUserPro: boolean
): Result<URL, CDNErrorType> {
	if (!isBunnyCdnConfigured()) return err(CDNErrorType.ServiceUnavailable);
	const cache = getLatestSitePacks();

	const latestRecord = cache.get(sitePackUuid);

	if (!latestRecord) {
		return err(CDNErrorType.SitePackNotFound);
	}

	if (latestRecord.requiresProSubscription && !isUserPro) {
		return err(CDNErrorType.ProSubscriptionRequired);
	}

	const sitePackPath = new URL(latestRecord.fileName, sitePacksBasePath);

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
	if (!isBunnyCdnConfigured()) return err(CDNErrorType.ServiceUnavailable);
	const latestRecord = getLatestResistanceScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	const resistanceScriptsPath = new URL(
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

export function getInstallerURL(
	os: 'windows' | 'linux' | 'macos',
	architecture: 'x64' | 'arm64'
): Result<{ url: URL; version: string; sha256: string; size: number }, CDNErrorType> {
	if (!isBunnyCdnConfigured()) return err(CDNErrorType.ServiceUnavailable);
	const latestRecord = getInstallerFor(os, architecture);

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	const installerPath = new URL(
		`${latestRecord.version}/${latestRecord.os}/${latestRecord.architecture}/${latestRecord.fileName}`,
		installersBasePath
	);

	// No auth token needed for installers (publicly accessible)

	return ok({
		url: installerPath,
		version: latestRecord.version,
		sha256: latestRecord.sha256,
		size: latestRecord.size
	});
}
