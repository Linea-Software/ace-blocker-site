import { getLatestInstallerCache } from '$lib/server/api/cache';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const installer = await getLatestInstallerCache();

	if (!installer) {
		error(404, { message: 'No installer versions have been published yet.' });
	}

	return {
		installer: {
			version: installer.version,
			size: installer.size,
			os: installer.os,
			architecture: installer.architecture,
			createdAt: installer.createdAt
		}
	};
};
