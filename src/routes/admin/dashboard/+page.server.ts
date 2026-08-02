import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, proStatus, siteVisits } from '$lib/server/db/schema';
import { count, desc, gt } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const [totalUsersCount] = await db.select({ value: count() }).from(user);
	const [proUsersCount] = await db
		.select({ value: count() })
		.from(proStatus)
		.where(gt(proStatus.expiration, new Date()));

	// Total site visits (all time)
	const [totalVisits] = await db
		.select({ value: count() })
		.from(siteVisits);

	// Visits in the last 7 days
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	const [weeklyVisits] = await db
		.select({ value: count() })
		.from(siteVisits)
		.where(gt(siteVisits.timestamp, sevenDaysAgo));

	// Top 5 most visited paths in the last 30 days
	const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const topPages = await db
		.select({
			path: siteVisits.path,
			visits: count()
		})
		.from(siteVisits)
		.where(gt(siteVisits.timestamp, thirtyDaysAgo))
		.groupBy(siteVisits.path)
		.orderBy(desc(count()))
		.limit(5);

	return {
		totalUsers: totalUsersCount.value,
		proUsers: proUsersCount.value,
		siteVisits: totalVisits.value,
		weeklyVisits: weeklyVisits.value,
		topPages: topPages.map((p) => ({ path: p.path, visits: p.visits }))
	};
};
