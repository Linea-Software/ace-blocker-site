import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api-client';

export const load: PageServerLoad = async () => {
	const response = await apiClient.v1.admin['site-lists'].get();

	if (response.error) {
		throw new Error('Failed to load site lists');
	}

	return {
		siteLists: response.data.siteLists,
		totalDownloads: response.data.totalDownloads
	};
};
