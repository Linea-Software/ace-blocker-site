import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api-client';

export const load: PageServerLoad = async () => {
	const response = await apiClient.v1.admin.resistance.get();

	if (response.error) {
		throw new Error('Failed to load resistance scripts');
	}

	return {
		releases: response.data.releases,
		totalDownloads: response.data.totalDownloads
	};
};
