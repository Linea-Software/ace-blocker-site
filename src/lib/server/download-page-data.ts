import { isPublicDownloadEnabled } from '$lib/public-download-platforms';
import { getInstallerFor } from '$lib/server/cache';
import type {
	DownloadOS,
	DownloadPlatforms
} from '../../routes/download/_components/download-data';

export async function loadDownloadPlatforms(): Promise<DownloadPlatforms> {
	const targets: { os: DownloadOS; architecture: 'x64' | 'arm64' }[] = [
		{ os: 'windows', architecture: 'x64' },
		{ os: 'windows', architecture: 'arm64' },
		{ os: 'linux', architecture: 'x64' },
		{ os: 'linux', architecture: 'arm64' },
		{ os: 'macos', architecture: 'x64' },
		{ os: 'macos', architecture: 'arm64' }
	];
	function first(os: DownloadOS) {
		if (!isPublicDownloadEnabled(os)) return null;
		for (const t of targets) {
			if (t.os !== os) continue;
			const row = getInstallerFor(t.os, t.architecture);
			if (row)
				return {
					version: row.version,
					size: row.size,
					fileName: row.fileName,
					os: row.os as DownloadOS,
					architecture: row.architecture,
					hash: row.sha256
				};
		}
		return null;
	}
	return { windows: first('windows'), linux: first('linux'), macos: first('macos') };
}
