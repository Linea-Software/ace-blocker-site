import { getLatestReleasesCache } from '$lib/server/api/cache';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const cache = await getLatestReleasesCache();

	if (!cache.installers) {
		error(404, { message: 'No installer versions have been published yet.' });
	}

	return {
		installer: {
			version: cache.installers.version,
			size: cache.installers.size,
			os: cache.installers.os,
			architecture: cache.installers.architecture,
			createdAt: cache.installers.createdAt
		}
	};
};
