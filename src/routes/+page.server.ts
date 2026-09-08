import { getLatestInstaller } from '$lib/server/cache';
import { isRecentRelease } from '$lib/utils/release';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const latestInstaller = getLatestInstaller();

	if (!latestInstaller) {
		return { newRelease: null };
	}

	return {
		newRelease: isRecentRelease(latestInstaller.createdAt)
			? {
					version: latestInstaller.version
				}
			: null
	};
};
