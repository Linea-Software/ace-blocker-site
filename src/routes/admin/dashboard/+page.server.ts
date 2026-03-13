import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { count, gt } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [totalUsersCount] = await db.select({ value: count() }).from(user);
	const [proUsersCount] = await db
		.select({ value: count() })
		.from(user)
		.where(gt(user.proExpiration, new Date()));

	return {
		totalUsers: totalUsersCount.value,
		proUsers: proUsersCount.value,
		siteVisits: 0 // analytics table not yet implemented
	};
};
