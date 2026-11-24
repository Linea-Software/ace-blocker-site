import { query } from '@solidjs/router';
import { assertAdminSession } from '../../auth';
import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { getAceHostsSitePackSyncStatus } from '$lib/server/ace-hosts-site-packs';

export const getSitePacksData = query(async () => {
	'use server';
	await assertAdminSession();
	const sitePacks = await db.select().from(sitePack).orderBy(desc(sitePack.updatedAt));
	const totalDownloads = sitePacks.reduce((sum, pack) => sum + pack.downloadCount, 0);

	return {
		sitePacks,
		totalDownloads,
		syncStatus: getAceHostsSitePackSyncStatus()
	};
}, 'admin-sitepacks');
