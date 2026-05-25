import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
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
	siteListsUploadBase,
	resistanceModeScriptsUploadBase,
	installersUploadBase
} from './common';
import { createLogger } from '$lib/server/logger';

const log = createLogger('cdn:delete');

async function deleteFileFromBunnyCDN(endpointUrl: URL): Promise<Result<void, CDNErrorType>> {
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

export async function deleteTrackingScripts(id: string): Promise<Result<void, CDNErrorType>> {
	const release = await db.query.trackingScripts.findFirst({
		where: eq(trackingScripts.id, id)
	});

	if (!release) {
		return err(CDNErrorType.DeleteFailed);
	}

	const endpointUrl = new URL(
		`${release.version}/${release.fileName}`,
		trackingScriptsUploadBase
	);

	const deleteResult = await deleteFileFromBunnyCDN(endpointUrl);
	if (deleteResult.isErr()) {
		return err(deleteResult.error);
	}

	await db.delete(trackingScripts).where(eq(trackingScripts.id, id));
	await invalidateTrackingCache();

	return ok(undefined);
}

export async function deleteSiteList(id: string): Promise<Result<void, CDNErrorType>> {
	const release = await db.query.siteList.findFirst({
		where: eq(siteList.id, id)
	});

	if (!release) {
		return err(CDNErrorType.DeleteFailed);
	}

	const endpointUrl = new URL(`${release.fileName}`, siteListsUploadBase);

	const deleteResult = await deleteFileFromBunnyCDN(endpointUrl);
	if (deleteResult.isErr()) {
		return err(deleteResult.error);
	}

	await db.delete(siteList).where(eq(siteList.id, id));
	await invalidateSiteListsCache();

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
