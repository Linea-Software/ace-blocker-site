import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const sitePacks = await db.select().from(sitePack).orderBy(desc(sitePack.updatedAt));
	const totalDownloads = sitePacks.reduce((sum, pack) => sum + pack.downloadCount, 0);

	return {
		sitePacks,
		totalDownloads
	};
};
