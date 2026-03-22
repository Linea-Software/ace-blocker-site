import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY } from '$env/static/private';
import crypto from 'crypto';
import { invalidateCache } from '$lib/server/api/cache';

export const load: PageServerLoad = async () => {
	const latest = await db.select().from(siteList).orderBy(desc(siteList.updatedAt)).limit(1);
	const stats = await db.select({
		total: sql<number>`CAST(SUM(${siteList.downloadCount}) AS INTEGER)`
	}).from(siteList);

	return {
		siteLists: {
			latest: latest[0] || null,
			totalDownloads: stats[0]?.total || 0
		}
	};
};

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const id = formData.get('id') as string;
		const requiresProSubscription = formData.get('requiresProSubscription') === 'true';

		if (!file || !file.size || !name || !id) {
			return fail(400, { error: true, message: 'Missing required configuration for deploy (File, Name or ID)' });
		}

		let arrayBuffer: ArrayBuffer;
		let size = 0;
		let fileHash = '';

		try {
			arrayBuffer = await file.arrayBuffer();
			size = file.size;

			const buffer = Buffer.from(arrayBuffer);
			fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

			const listFileName = `${id}.zip`;
			const endpointUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/site-lists/${listFileName}`;

			const cdnResponse = await fetch(endpointUrl, {
				method: 'PUT',
				headers: {
					'AccessKey': BUNNY_STORAGE_ACCESS_KEY,
					'Content-Type': 'application/octet-stream',
				},
				body: arrayBuffer
			});

			if (!cdnResponse.ok) return fail(500, { error: true, message: 'BunnyCDN deployment failed.' });

			const cdnDownloadUrl = `https://cdn.aceblocker.com/site-lists/${listFileName}`;

			await db.insert(siteList).values({
				id: id,
				name: name,
				fileName: listFileName,
				downloadUrl: cdnDownloadUrl,
				sha256: fileHash,
				size: size,
				requiresProSubscription: requiresProSubscription,
				canBeDownloaded: true,
				downloadCount: 0
			}).onConflictDoUpdate({
				target: siteList.id,
				set: {
					name: name,
					fileName: listFileName,
					downloadUrl: cdnDownloadUrl,
					sha256: fileHash,
					size: size,
					requiresProSubscription: requiresProSubscription,
					updatedAt: sql`CURRENT_TIMESTAMP`
				}
			});

			await invalidateCache();
			return { success: true, message: 'Deployment to CDN and Database overwrite successful' };
			
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
