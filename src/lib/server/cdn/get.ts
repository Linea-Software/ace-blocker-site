import { err, ok, Result } from 'neverthrow';
import {
	getLatestSiteLists,
	getLatestResistanceScript,
	getLatestTrackingScript,
	getLatestInstaller
} from '$lib/server/cache';
import {
	CDNErrorType,
	siteListsBasePath,
	resistanceModeScriptBasePath,
	trackingScriptsBasePath,
	installersBasePath,
	generateBunnyCDNToken
} from './common';

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

export function getTrackingScriptsURL(): Result<{ url: URL; version: string }, CDNErrorType> {
	const latestRecord = getLatestTrackingScript();

	if (!latestRecord) {
		return err(CDNErrorType.NoReleaseAvailable);
	}

	let trackingScriptsPath = new URL(
		`/${latestRecord.version}/${latestRecord.fileName}`,
		trackingScriptsBasePath
	);

	// No auth token needed for tracking scripts (publicly accessible)

	return ok({ url: trackingScriptsPath, version: latestRecord.version });
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
		`/${latestRecord.version}/${latestRecord.os}/${latestRecord.architecture}/${latestRecord.fileName}`,
		installersBasePath
	);

	// No auth token needed for installers (publicly accessible)

	return ok({ url: installerPath, version: latestRecord.version });
}
