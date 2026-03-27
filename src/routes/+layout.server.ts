import type { LayoutServerLoad } from './$types';
import { isUserPro } from '$lib/server/pro';

export const load: LayoutServerLoad = async ({ locals }) => {
	let isPro = false;

	if (locals.user) {
		isPro = await isUserPro(locals.user.id);
	}

	return {
		user: locals.user,
		session: locals.session,
		isPro
	};
};
