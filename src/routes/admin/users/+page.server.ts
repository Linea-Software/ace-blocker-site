import type { PageServerLoad, Actions } from './$types';
import { auth } from '$lib/server/auth';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, request }) => {
	const search = url.searchParams.get('search');

	const { users } = await auth.api.listUsers({
		query: {
			...(search && {
				searchValue: search,
				searchField: 'email'
			}),
			limit: 100
		},
		headers: request.headers
	});

	return {
		users
	};
};

export const actions: Actions = {
	delete: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { message: 'User ID is required' });

		await auth.api.removeUser({
			body: { userId },
			headers: request.headers
		});
		return { success: true };
	},

	toggleStatus: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;
		const isBanned = formData.get('isBanned') === 'true';

		if (!userId) return fail(400, { message: 'User ID is required' });

		if (isBanned) {
			await auth.api.unbanUser({
				body: { userId },
				headers: request.headers
			});
		} else {
			await auth.api.banUser({
				body: { userId, banReason: 'Admin disabled' },
				headers: request.headers
			});
		}
		return { success: true };
	},

	grantPro: async ({ request }) => {
		const formData = await request.formData();
		const userId = formData.get('userId') as string;

		if (!userId) return fail(400, { message: 'User ID is required' });

		// Grant a 1-year Pro license
		const oneYearFromNow = new Date();
		oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

		await auth.api.adminUpdateUser({
			body: {
				userId,
				data: {
					proExpiration: oneYearFromNow,
					proStatusCachedAt: new Date()
				}
			},
			headers: request.headers
		});

		return { success: true };
	}
};
