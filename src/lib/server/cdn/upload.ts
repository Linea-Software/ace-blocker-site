import { err, ok, Result } from 'neverthrow';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';
import { invalidateTrackingCache } from '$lib/server/cache';
import {
	CDNErrorType,
	trackingScriptsUploadBase,
	trackingScriptsBasePath,
	trackingScriptsFileName,
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
