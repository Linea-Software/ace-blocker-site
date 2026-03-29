import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import {
	trackingScripts,
	siteList,
	resistanceModeScripts,
	aceBlockerInstaller
} from '$lib/server/db/schema';
import {
	invalidateTrackingCache,
	invalidateSiteListsCache,
	invalidateResistanceCache,
	invalidateInstallerCache
} from '$lib/server/cache';
import {
	CDNErrorType,
	trackingScriptsUploadBase,
	trackingScriptsBasePath,
	trackingScriptsFileName,
	siteListsUploadBase,
	siteListsBasePath,
	resistanceModeScriptsUploadBase,
	resistanceModeScriptBasePath,
	resistanceModeScriptsFileName,
	installersUploadBase,
	getArrayBufferChecksum
} from './common';

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

export async function uploadSiteList(
	file: File,
	name: string,
	id: string,
	requiresProSubscription: boolean,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const listFileName = `${id}.zip`;
	const endpointUrl = new URL(`/${listFileName}`, siteListsUploadBase);

	const uploadResult = await uploadFileToBunnyCDN(
		file,
		new URL(endpointUrl, siteListsUploadBase)
	);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, siteListsBasePath).toString();

	await db
		.insert(siteList)
		.values({
			id: id,
			name: name,
			fileName: listFileName,
			downloadUrl: downloadUrl,
			sha256: hash,
			size: file.size,
			requiresProSubscription: requiresProSubscription,
			canBeDownloaded: canBeDownloaded,
			downloadCount: 0
		})
		.onConflictDoUpdate({
			target: siteList.id,
			set: {
				name: name,
				fileName: listFileName,
				downloadUrl: downloadUrl,
				sha256: hash,
				size: file.size,
				requiresProSubscription: requiresProSubscription,
				updatedAt: sql`CURRENT_TIMESTAMP`
			}
		});

	await invalidateSiteListsCache();

	return ok({ downloadUrl, hash });
}

export async function uploadResistanceModeScript(
	file: File,
	version: string,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const endpointUrl = new URL(
		`/${version}/${resistanceModeScriptsFileName}`,
		resistanceModeScriptsUploadBase
	);

	const uploadResult = await uploadFileToBunnyCDN(
		file,
		new URL(endpointUrl, resistanceModeScriptsUploadBase)
	);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, resistanceModeScriptBasePath).toString();

	await db.insert(resistanceModeScripts).values({
		id: crypto.randomUUID(),
		fileName: resistanceModeScriptsFileName,
		version,
		downloadUrl,
		sha256: hash,
		size: file.size,
		canBeDownloaded: canBeDownloaded,
		downloadCount: 0
	});

	await invalidateResistanceCache();

	return ok({ downloadUrl, hash });
}

export async function uploadInstaller(
	file: File,
	version: string,
	os: 'windows' | 'linux' | 'macos',
	architecture: 'x64' | 'arm64',
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const fileExt = file.name.split('.').pop();
	const installerFileName = `Ace Blocker Installer.${fileExt}`;
	const endpointUrl = new URL(
		`/${version}/${os}/${architecture}/${installerFileName}`,
		installersUploadBase
	);

	const uploadResult = await uploadFileToBunnyCDN(
		file,
		new URL(endpointUrl, installersUploadBase)
	);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, installersUploadBase).toString();

	await db.insert(aceBlockerInstaller).values({
		id: crypto.randomUUID(),
		fileName: installerFileName,
		version,
		os: os,
		architecture: architecture,
		downloadUrl,
		sha256: hash,
		size: file.size,
		canBeDownloaded: canBeDownloaded,
		downloadCount: 0
	});

	await invalidateInstallerCache();

	return ok({ downloadUrl, hash });
}
