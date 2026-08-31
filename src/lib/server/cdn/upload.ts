import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { db } from '$lib/server/db';
import { sql } from 'drizzle-orm';
import {
	trackingScripts,
	sitePack,
	resistanceModeScripts,
	aceBlockerInstaller
} from '$lib/server/db/schema';
import {
	invalidateTrackingCache,
	invalidateSitePacksCache,
	invalidateResistanceCache,
	invalidateInstallerCache
} from '$lib/server/cache';
import {
	CDNErrorType,
	trackingScriptsUploadBase,
	trackingScriptsBasePath,
	trackingScriptsFileName,
	sitePacksUploadBase,
	sitePacksBasePath,
	resistanceModeScriptsUploadBase,
	resistanceModeScriptBasePath,
	resistanceModeScriptsFileName,
	installersUploadBase,
	getArrayBufferChecksum,
	isValidArtifactFile,
	isValidArtifactName,
	isValidArtifactVersion,
	MAX_ARTIFACT_SIZE
} from './common';
import { deleteFileFromBunnyCDN } from './delete';
import { createLogger } from '$lib/server/logger';

const log = createLogger('cdn:upload');

/**
 * Validates an uploaded artifact file (size cap + type check). Returns a
 * human-readable reason when invalid.
 */
async function validateArtifactFile(
	file: File,
	label: string,
	options: { zip: boolean }
): Promise<string | null> {
	if (file.size <= 0) {
		return `The ${label} file is empty`;
	}
	if (file.size > MAX_ARTIFACT_SIZE) {
		return `The ${label} file exceeds the 100 MB upload limit`;
	}
	if (!(await isValidArtifactFile(file, options))) {
		return `The ${label} file is not a valid ${options.zip ? 'zip archive' : 'file type'}`;
	}
	return null;
}

/**
 * Validates a (file, version) pair before any CDN or DB write. Returns a
 * human-readable reason when invalid.
 */
async function validateArtifact(
	file: File,
	version: string,
	label: string,
	options: { zip: boolean }
): Promise<string | null> {
	if (!isValidArtifactVersion(version)) {
		return `Invalid ${label} version '${version}': use 1-64 URL-safe characters ([A-Za-z0-9._-], no slashes or traversal)`;
	}
	return validateArtifactFile(file, label, options);
}

async function uploadFileToBunnyCDN(
	file: File,
	endpointUrl: URL
): Promise<Result<{ hash: string }, CDNErrorType>> {
	const arrayBuffer = await file.arrayBuffer();
	const hash = getArrayBufferChecksum(arrayBuffer);

	try {
		log.info({ url: endpointUrl.toString() }, 'Uploading to BunnyCDN');
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
			log.error(
				{ status: response.status, url: endpointUrl.toString() },
				'BunnyCDN upload failed'
			);
			return err(CDNErrorType.UploadFailed);
		}

		return ok({ hash: hash });
	} catch (error) {
		log.error(
			{ err: error, url: endpointUrl.toString() },
			'Network failure during BunnyCDN upload'
		);
		return err(CDNErrorType.NetworkFailure);
	}
}

export async function uploadTrackingScripts(
	file: File,
	version: string,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const validationError = await validateArtifact(file, version, 'tracking scripts', {
		zip: true
	});
	if (validationError) {
		log.warn({ version }, `Rejected tracking scripts upload: ${validationError}`);
		return err(CDNErrorType.InvalidArtifact);
	}

	const endpointUrl = new URL(`${version}/${trackingScriptsFileName}`, trackingScriptsUploadBase);

	const uploadResult = await uploadFileToBunnyCDN(file, endpointUrl);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, trackingScriptsBasePath).toString();

	try {
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
	} catch (error) {
		log.error({ err: error, version }, 'DB insert failed after CDN upload; cleaning up object');
		await deleteFileFromBunnyCDN(endpointUrl);
		return err(CDNErrorType.UploadFailed);
	}

	await invalidateTrackingCache();

	return ok({ downloadUrl, hash });
}

export async function uploadSitePack(
	file: File,
	name: string,
	id: string,
	requiresProSubscription: boolean,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	// Site pack ids become CDN object names — same path-safety rules as
	// versions (id is a generated uuid in practice; validate anyway).
	if (!isValidArtifactVersion(id)) {
		log.warn({ id }, `Rejected site pack upload: unsafe id`);
		return err(CDNErrorType.InvalidArtifact);
	}
	// The name is a human-readable display value (spaces and punctuation are
	// expected, e.g. "Adult Content Pack"); it never becomes a CDN path
	// segment, so only a loose guard applies.
	if (!isValidArtifactName(name)) {
		log.warn({ id, name }, 'Rejected site pack upload: invalid name');
		return err(CDNErrorType.InvalidArtifact);
	}
	const validationError = await validateArtifactFile(file, 'site pack', { zip: true });
	if (validationError) {
		log.warn({ id }, `Rejected site pack upload: ${validationError}`);
		return err(CDNErrorType.InvalidArtifact);
	}

	const listFileName = `${id}.zip`;
	const endpointUrl = new URL(`${listFileName}`, sitePacksUploadBase);

	const uploadResult = await uploadFileToBunnyCDN(file, endpointUrl);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, sitePacksBasePath).toString();

	try {
		await db
			.insert(sitePack)
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
				target: sitePack.id,
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
	} catch (error) {
		log.error({ err: error, id }, 'DB write failed after CDN upload; cleaning up object');
		await deleteFileFromBunnyCDN(endpointUrl);
		return err(CDNErrorType.UploadFailed);
	}

	await invalidateSitePacksCache();

	return ok({ downloadUrl, hash });
}

export async function uploadResistanceModeScript(
	file: File,
	version: string,
	canBeDownloaded: boolean = true
): Promise<Result<{ downloadUrl: string; hash: string }, CDNErrorType>> {
	const validationError = await validateArtifact(file, version, 'resistance scripts', {
		zip: true
	});
	if (validationError) {
		log.warn({ version }, `Rejected resistance scripts upload: ${validationError}`);
		return err(CDNErrorType.InvalidArtifact);
	}

	const endpointUrl = new URL(
		`${version}/${resistanceModeScriptsFileName}`,
		resistanceModeScriptsUploadBase
	);

	const uploadResult = await uploadFileToBunnyCDN(file, endpointUrl);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, resistanceModeScriptBasePath).toString();

	try {
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
	} catch (error) {
		// The CDN object is already stored — remove it so a failed DB insert
		// never leaves an inconsistent database/CDN state behind.
		log.error(
			{ err: error, version },
			'DB insert failed after CDN upload; cleaning up object'
		);
		await deleteFileFromBunnyCDN(endpointUrl);
		return err(CDNErrorType.UploadFailed);
	}

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
	const validationError = await validateArtifact(file, version, 'installer', { zip: false });
	if (validationError) {
		log.warn({ version }, `Rejected installer upload: ${validationError}`);
		return err(CDNErrorType.InvalidArtifact);
	}

	const fileExt = file.name.split('.').pop();
	const installerFileName = `Ace Blocker Installer.${fileExt}`;
	const endpointUrl = new URL(
		`${version}/${os}/${architecture}/${installerFileName}`,
		installersUploadBase
	);

	const uploadResult = await uploadFileToBunnyCDN(file, endpointUrl);
	if (uploadResult.isErr()) {
		return err(uploadResult.error);
	}

	const { hash } = uploadResult._unsafeUnwrap();
	const downloadUrl = new URL(endpointUrl, installersUploadBase).toString();

	try {
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
	} catch (error) {
		log.error({ err: error, version }, 'DB insert failed after CDN upload; cleaning up object');
		await deleteFileFromBunnyCDN(endpointUrl);
		return err(CDNErrorType.UploadFailed);
	}

	await invalidateInstallerCache();

	return ok({ downloadUrl, hash });
}
