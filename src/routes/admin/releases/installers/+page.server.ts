import type { PageServerLoad } from './$types';
import { apiClient } from '$lib/api-client';

export const load: PageServerLoad = async () => {
	const response = await apiClient.v1.admin.installers.get();

	if (response.error) {
		throw new Error('Failed to load installers');
	}

	return {
		installers: response.data.installers,
		totalDownloads: response.data.totalDownloads
	};
};
