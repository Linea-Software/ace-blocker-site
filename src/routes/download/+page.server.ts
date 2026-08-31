import { getInstallerFor, getLatestInstaller } from '$lib/server/cache';
import type { PageServerLoad } from './$types';

// Route arch ids → installer lookup target, mirroring the [arch] download
// route so the page shows the metadata (version, size, sha256) of the exact
// installer the visitor will receive.
const ARCH_TARGETS: Record<
	string,
	{ os: 'windows' | 'linux' | 'macos'; architecture: 'x64' | 'arm64' }
> = {
	windows_x64: { os: 'windows', architecture: 'x64' },
	linux_x64: { os: 'linux', architecture: 'x64' },
	macos_universal: { os: 'macos', architecture: 'x64' }
};

export const load: PageServerLoad = async ({ url }) => {
	const requestedArch = url.searchParams.get('arch') ?? 'windows_x64';
	const target = ARCH_TARGETS[requestedArch];

	// Prefer the requested platform's row; fall back to whatever is latest.
	const installer = (target && getInstallerFor(target.os, target.architecture)) || getLatestInstaller();

	return {
		installer: installer
			? {
					version: installer.version,
					size: installer.size,
					os: installer.os,
					architecture: installer.architecture,
					createdAt: installer.createdAt,
					hash: installer.sha256
				}
			: null
	};
};
