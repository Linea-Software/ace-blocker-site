import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/signin');
	}

	let customerName = locals.user.name;

	try {
		// Check current pro status
		const { isUserPro } = await import('$lib/server/pro');
		const isPro = await isUserPro(locals.user.id);

		return {
			success: true,
			customerName,
			isPro
		};
	} catch (error) {
		console.error('Error checking pro status:', error);
		return {
			success: false,
			error: 'Failed to generate access keys. Please try refreshing the page.'
		};
	}
};
