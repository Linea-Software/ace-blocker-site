import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';

import { ilike } from 'drizzle-orm';

export const load: PageServerLoad = async ({ url, request }) => {
	const search = url.searchParams.get('search');

	const users = await db.query.user.findMany({
		where: search ? ilike(user.email, `%${search}%`) : undefined,
		limit: 100,
		with: {
			proStatus: true
		}
	});

	return {
		users: users.map(u => ({
			...u,
			proExpiration: u.proStatus?.expiration,
			proStatusCachedAt: u.proStatus?.cachedAt
		}))
	};
};
