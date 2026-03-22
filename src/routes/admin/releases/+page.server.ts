import { db } from '$lib/server/db';
import { aceBlockerInstaller, resistanceModeScripts, trackingScripts, siteList } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const fetchStats = async (table: any, orderField: any) => {
		const latest = await db.select().from(table).orderBy(desc(orderField)).limit(1);
		const stats = await db.select({
			total: sql<number>`CAST(SUM(${table.downloadCount}) AS INTEGER)`
		}).from(table);

		return {
			latest: latest[0] || null,
			totalDownloads: stats[0]?.total || 0
		};
	};

	const [installers, resistance, tracking, siteLists] = await Promise.all([
		fetchStats(aceBlockerInstaller, aceBlockerInstaller.createdAt),
		fetchStats(resistanceModeScripts, resistanceModeScripts.createdAt),
		fetchStats(trackingScripts, trackingScripts.createdAt),
		fetchStats(siteList, siteList.updatedAt)
	]);

	return {
		installers,
		resistance,
		tracking,
		siteLists
	};
};
