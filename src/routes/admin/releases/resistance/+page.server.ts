import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { resistanceModeScripts } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { getBoredomEngineImportStatus } from '$lib/server/boredom-engine-release';

export const load: PageServerLoad = async () => {
	const releases = await db
		.select()
		.from(resistanceModeScripts)
		.orderBy(desc(resistanceModeScripts.createdAt));
	const totalDownloads = releases.reduce((sum, release) => sum + release.downloadCount, 0);

	return {
		releases,
		totalDownloads,
		githubImportStatus: getBoredomEngineImportStatus()
	};
};
