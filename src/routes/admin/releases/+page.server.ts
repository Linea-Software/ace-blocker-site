import { db } from '$lib/server/db';
import { aceBlockerInstaller, resistanceModeScripts, trackingScripts, siteList } from '$lib/server/db/schema';
import { desc, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY } from '$env/static/private';
import crypto from 'crypto';

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

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const category = formData.get('category') as string;
		const version = formData.get('version') as string;
		
		if (!file || !file.size || !category || !version) {
			return fail(400, { error: true, message: 'Missing required configuration for deploy (File, Category or Version)' });
		}

		let folderPath = '';
		if (category === 'installers') folderPath = `ace-blocker-installer/${version}`;
		else if (category === 'resistance') folderPath = `resistance-mode-scripts/${version}`;
		else if (category === 'tracking') folderPath = `tracking-scripts/${version}`;
		else if (category === 'siteLists') folderPath = `site-lists/${version}`;
		else {
			return fail(400, { error: true, message: 'Invalid category designated' });
		}

		let arrayBuffer: ArrayBuffer;
		let size = 0;
		let fileHash = '';

		try {
			arrayBuffer = await file.arrayBuffer();
			size = file.size;
			
			const buffer = Buffer.from(arrayBuffer);
			fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

			if (category === 'siteLists') {
				const id = formData.get('id') as string;
				const url = formData.get('url') as string;
				const requiresProSubscription = formData.get('requiresProSubscription') === 'true';

				if (!id || !url) {
					return fail(400, { error: true, message: 'Missing require Site List fields (ID or URL)' });
				}

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
					name: version, 
					url: url,
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
						name: version,
						url: url,
						fileName: listFileName,
						downloadUrl: cdnDownloadUrl,
						sha256: fileHash,
						size: size,
						requiresProSubscription: requiresProSubscription,
						updatedAt: sql`CURRENT_TIMESTAMP`
					}
				});

				return { success: true, message: 'Deployment to CDN and Database overwrite successful' };
			} else {
				// Other categories
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
				
				return { success: true, message: 'Deployment to CDN successful' };
			}
		} catch (e) {
			console.error("Upload crash:", e);
			return fail(500, { error: true, message: 'Internal server failure during binary deploy' });
		}
	},
	
	deleteRelease: async ({ request }) => {
		const formData = await request.formData();
		const category = formData.get('category') as string;
		
		if (!category) return fail(400, { error: true, message: 'Category required for deletion procedure' });
		
		// NOTE: In full implementation, retrieve latest version array from DB, 
		// request to Bunny API DELETE endpoint to wipe the folder, then cascade DB records
		return { success: true, message: 'Records targeted for deletion (Mock implementation)' };
	}
};
