import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	const releases = await db
		.select()
		.from(trackingScripts)
		.orderBy(desc(trackingScripts.createdAt));
	const totalDownloads = releases.reduce((sum, release) => sum + release.downloadCount, 0);

	return {
		releases,
		totalDownloads
	};
};
