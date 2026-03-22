import { db } from '$lib/server/db';
import { resistanceModeScripts } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY } from '$env/static/private';
import { invalidateCache } from '$lib/server/api/cache';

export const load: PageServerLoad = async () => {
	const latest = await db.select().from(resistanceModeScripts).orderBy(desc(resistanceModeScripts.createdAt)).limit(1);
	const stats = await db.select({
		total: sql<number>`CAST(SUM(${resistanceModeScripts.downloadCount}) AS INTEGER)`
	}).from(resistanceModeScripts);

	return {
		resistance: {
			latest: latest[0] || null,
			totalDownloads: stats[0]?.total || 0
		}
	};
};

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;

		if (!file || !file.size || !version) {
			return fail(400, { error: true, message: 'Missing required configuration for deploy (File or Version)' });
		}

		const folderPath = `resistance-mode-scripts/${version}`;

		try {
			const arrayBuffer = await file.arrayBuffer();
			
			const endpointUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${folderPath}/${file.name}`;

			const response = await fetch(endpointUrl, {
				method: 'PUT',
				headers: {
					'AccessKey': BUNNY_STORAGE_ACCESS_KEY,
					'Content-Type': 'application/octet-stream',
				},
				body: arrayBuffer
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("BunnyCDN Upload Error:", errorText);
				return fail(500, { error: true, message: 'Storage deploy failed at CDN network border' });
			}

			await invalidateCache();
			return { success: true, message: 'Deployment to CDN successful' };
		} catch (e) {
			console.error("Upload crash:", e);
			return fail(500, { error: true, message: 'Internal server failure during binary deploy' });
		}
	},

	deleteRelease: async () => {
		await invalidateCache();
		return { success: true, message: 'Records targeted for deletion (Mock implementation)' };
	}
};
