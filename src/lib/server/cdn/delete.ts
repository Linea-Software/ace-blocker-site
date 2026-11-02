import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sitePack, resistanceModeScripts, aceBlockerInstaller } from '$lib/server/db/schema';
import {
	invalidateSitePacksCache,
	invalidateResistanceCache,
	invalidateInstallerCache
} from '$lib/server/cache';
import {
	CDNErrorType,
	sitePacksUploadBase,
	resistanceModeScriptsUploadBase,
	installersUploadBase,
	isBunnyCdnConfigured
} from './common';
import { createLogger } from '$lib/server/logger';

const log = createLogger('cdn:delete');

/** Deletes a single object from BunnyCDN storage. Exported so the upload
 * path can clean up an orphaned object when its DB insert fails. */
export async function deleteFileFromBunnyCDN(
	endpointUrl: URL
): Promise<Result<void, CDNErrorType>> {
	if (!isBunnyCdnConfigured()) return err(CDNErrorType.ServiceUnavailable);
	try {
		const response = await fetch(endpointUrl, {
			method: 'DELETE',
			headers: {
				AccessKey: env.BUNNY_STORAGE_ACCESS_KEY
			}
		});

		if (!response.ok) {
			log.error(
				{ status: response.status, url: endpointUrl.toString() },
				'BunnyCDN delete failed'
			);
			return err(CDNErrorType.DeleteFailed);
		}

		return ok(undefined);
	} catch (error) {
		log.error(
			{ err: error, url: endpointUrl.toString() },
			'Network failure during BunnyCDN delete'
		);
		return err(CDNErrorType.NetworkFailure);
	}
}

export async function deleteSitePack(id: string): Promise<Result<void, CDNErrorType>> {
	const release = await db.query.sitePack.findFirst({
		where: eq(sitePack.id, id)
	});

	if (!release) {
		return err(CDNErrorType.DeleteFailed);
	}

	const endpointUrl = new URL(`${release.fileName}`, sitePacksUploadBase);

	const deleteResult = await deleteFileFromBunnyCDN(endpointUrl);
	if (deleteResult.isErr()) {
		return err(deleteResult.error);
	}

	await db.delete(sitePack).where(eq(sitePack.id, id));
	await invalidateSitePacksCache();

	return ok(undefined);
}

export async function deleteResistanceModeScript(id: string): Promise<Result<void, CDNErrorType>> {
	const release = await db.query.resistanceModeScripts.findFirst({
		where: eq(resistanceModeScripts.id, id)
	});

	if (!release) {
		return err(CDNErrorType.DeleteFailed);
	}

	const endpointUrl = new URL(
		`${release.version}/${release.fileName}`,
		resistanceModeScriptsUploadBase
	);

	const deleteResult = await deleteFileFromBunnyCDN(endpointUrl);
	if (deleteResult.isErr()) {
		return err(deleteResult.error);
	}

	await db.delete(resistanceModeScripts).where(eq(resistanceModeScripts.id, id));
	await invalidateResistanceCache();

	return ok(undefined);
}

export async function deleteInstaller(id: string): Promise<Result<void, CDNErrorType>> {
	const release = await db.query.aceBlockerInstaller.findFirst({
		where: eq(aceBlockerInstaller.id, id)
	});

	if (!release) {
		return err(CDNErrorType.DeleteFailed);
	}

	const endpointUrl = new URL(
		`${release.version}/${release.os}/${release.architecture}/${release.fileName}`,
		installersUploadBase
	);

	const deleteResult = await deleteFileFromBunnyCDN(endpointUrl);
	if (deleteResult.isErr()) {
		return err(deleteResult.error);
	}

	await db.delete(aceBlockerInstaller).where(eq(aceBlockerInstaller.id, id));
	await invalidateInstallerCache();

	return ok(undefined);
}
