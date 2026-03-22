import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY } from '$env/static/private';
import crypto from 'crypto';
import { invalidateSiteListsCache } from '$lib/server/api/cache';

export const load: PageServerLoad = async () => {
	const siteLists = await db.select().from(siteList).orderBy(desc(siteList.updatedAt));
	const stats = await db.select({
		total: sql<number>`CAST(SUM(${siteList.downloadCount}) AS INTEGER)`
	}).from(siteList);

	return {
		siteLists,
		totalDownloads: stats[0]?.total || 0
	};
};

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const id = formData.get('id') as string || crypto.randomUUID();
		const requiresProSubscription = formData.get('requiresProSubscription') === 'true';

		if (!file || !file.size || !name) {
			return fail(400, { error: true, message: 'Missing required configuration for deploy (File or Name)' });
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

			await invalidateSiteListsCache();
			return { success: true, message: 'Deployment to CDN and Database overwrite successful' };
			
		} catch (e) {
			console.error("Upload crash:", e);
			return fail(500, { error: true, message: 'Internal server failure during binary deploy' });
		}
	},

	updateRelease: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const requiresProSubscription = formData.get('requiresProSubscription') === 'on';

		if (!id || !name) {
			return fail(400, { error: true, message: 'Missing required fields' });
		}

		try {
			await db.update(siteList)
				.set({ 
					name, 
					requiresProSubscription,
					updatedAt: sql`CURRENT_TIMESTAMP`
				})
				.where(eq(siteList.id, id));

			await invalidateSiteListsCache();
			return { success: true, message: 'Site list updated successfully' };
		} catch (e) {
			console.error("Update error:", e);
			return fail(500, { error: true, message: 'Failed to update site list' });
		}
	},

	deleteRelease: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: true, message: 'Missing ID for deletion' });
		}

		try {
			// 1. Delete asset from BunnyCDN
			const listFileName = `${id}.zip`;
			const endpointUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/site-lists/${listFileName}`;

			await fetch(endpointUrl, {
				method: 'DELETE',
				headers: {
					'AccessKey': BUNNY_STORAGE_ACCESS_KEY
				}
			});

			// 2. Delete record from Database
			await db.delete(siteList).where(eq(siteList.id, id));
			
			await invalidateSiteListsCache();
			return { success: true, message: 'Site list and CDN assets deleted successfully' };
		} catch (e) {
			console.error("Delete error:", e);
			return fail(500, { error: true, message: 'Failed to delete site list' });
		}
	}
};
