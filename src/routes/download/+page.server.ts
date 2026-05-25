import { getLatestInstaller } from '$lib/server/cache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const installer = getLatestInstaller();

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
