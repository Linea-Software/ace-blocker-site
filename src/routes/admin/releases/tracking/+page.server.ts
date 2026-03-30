import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api-client';

export const load: PageServerLoad = async () => {
	const response = await apiClient.v1.admin.tracking.get();

	if (response.error) {
		throw new Error('Failed to load tracking scripts');
	}

	return {
		releases: response.data.releases,
		totalDownloads: response.data.totalDownloads
	};
};
