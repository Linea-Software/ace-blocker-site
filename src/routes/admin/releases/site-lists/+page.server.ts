import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const siteLists = await db.select().from(siteList).orderBy(desc(siteList.updatedAt));
	const totalDownloads = siteLists.reduce((sum, list) => sum + list.downloadCount, 0);

	return {
		siteLists,
		totalDownloads
	};
};
