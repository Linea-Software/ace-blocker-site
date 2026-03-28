import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';
import { invalidateTrackingCache } from '$lib/server/cache';
import { CDNErrorType, trackingScriptsUploadBase } from './common';

async function deleteFileFromBunnyCDN(
	endpointUrl: URL
): Promise<Result<void, CDNErrorType>> {
	try {
		const response = await fetch(endpointUrl, {
			method: 'DELETE',
			headers: {
				AccessKey: env.BUNNY_STORAGE_ACCESS_KEY
			}
		});

		if (!response.ok) {
			console.error('Unable to delete file from BunnyCDN:\n' + response);
			return err(CDNErrorType.DeleteFailed);
		}

		return ok(undefined);
	} catch (error) {
		console.error('Network failure during BunnyCDN file deletion:\n' + error);
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
		`/${release.version}/${release.fileName}`,
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
