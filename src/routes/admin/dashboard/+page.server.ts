import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// These will be replaced with real DB queries
	return {
		totalUsers: 1250,
		proUsers: 450,
		siteVisits: 12400
	};
};
