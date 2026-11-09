import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';
import type { aceBlockerInstaller } from '$lib/server/db/schema';
import { installersUploadBase } from '$lib/server/cdn/common';
import { validateInstallerArtifact } from './installer-artifact-validation';
import { expectedInstallerFile, supportedInstallerTarget } from '$lib/installer-release-policy';

/**
 * Re-read the stored object before it becomes public. CDN availability is never
 * itself evidence of integrity. Enforce strict size and SHA-256 on the actual bytes.
 */
export async function verifyLegacyInstallerObject(
	release: typeof aceBlockerInstaller.$inferSelect
): Promise<void> {
	if (
		!release.artifactValidatedAt ||
		!supportedInstallerTarget(release.os, release.architecture)
	) {
		throw new Error('Installer has not passed structural validation');
	}
	const name = expectedInstallerFile(release.os, release.version);
	if (
		!/^\d+\.\d+\.\d+$/.test(release.version) ||
		!name ||
		release.fileName !== name ||
		!/^[a-f0-9]{64}$/.test(release.sha256) ||
		!Number.isSafeInteger(release.size) ||
		release.size < 1 ||
		release.size > 100 * 1024 * 1024
	) {
		throw new Error('Invalid installer metadata');
	}
	const storageUrl = new URL(
		`${release.version}/${release.os}/${release.architecture}/${name}`,
		installersUploadBase
	);
	const response = await fetch(storageUrl, {
		headers: { AccessKey: env.BUNNY_STORAGE_ACCESS_KEY }
	});
	if (!response.ok || !response.body) throw new Error('Installer cannot be read from storage');
	const expectedContentLength = response.headers.get('content-length');
	if (expectedContentLength && Number(expectedContentLength) !== release.size) {
		throw new Error('Installer stored size mismatch');
	}
	const sha = createHash('sha256');
	let size = 0;
	const bytes: Buffer[] = [];
	for await (const chunk of response.body) {
		size += chunk.byteLength;
		if (size > release.size) {
			await response.body.cancel().catch(() => undefined);
			throw new Error('Stored installer exceeds declared size');
		}
		sha.update(chunk);
		bytes.push(Buffer.from(chunk));
	}
	if (size !== release.size || sha.digest('hex') !== release.sha256) {
		throw new Error('Stored installer has changed since upload');
	}
	const file = new File([Buffer.concat(bytes)], name);
	const reason = await validateInstallerArtifact(
		file,
		release.version,
		release.os,
		release.architecture
	);
	if (reason) throw new Error(`Stored installer failed validation: ${reason}`);
}
