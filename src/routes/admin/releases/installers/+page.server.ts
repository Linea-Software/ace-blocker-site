import { db } from '$lib/server/db';
import { aceBlockerInstaller } from '$lib/server/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { BUNNY_STORAGE_ZONE, BUNNY_STORAGE_ACCESS_KEY } from '$env/static/private';
import { invalidateCache } from '$lib/server/api/cache';

export const load: PageServerLoad = async () => {
	const installers = await db.select().from(aceBlockerInstaller).orderBy(desc(aceBlockerInstaller.createdAt));
	const stats = await db.select({
		total: sql<number>`CAST(SUM(${aceBlockerInstaller.downloadCount}) AS INTEGER)`
	}).from(aceBlockerInstaller);

	return {
		installers,
		totalDownloads: stats[0]?.total || 0
	};
};

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;
		const os = formData.get('os') as any;
		const architecture = formData.get('architecture') as any;

		if (!file || !file.size || !version) {
			return fail(400, { error: true, message: 'Missing required configuration for deploy (File or Version)' });
		}

		const folderPath = `ace-blocker-installer/${version}`;

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

			const downloadUrl = `https://cdn.aceblocker.com/${folderPath}/${file.name}`;

			// Hash file for security
			const crypto = await import('crypto');
			const buffer = Buffer.from(arrayBuffer);
			const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

			await db.insert(aceBlockerInstaller).values({
				id: crypto.randomUUID(),
				fileName: file.name,
				version,
				os,
				architecture,
				downloadUrl,
				sha256: fileHash,
				size: file.size,
				canBeDownloaded: true,
				downloadCount: 0
			});

			await invalidateCache();
			return { success: true, message: 'Deployment to CDN and database successful' };
		} catch (e) {
			console.error("Upload crash:", e);
			return fail(500, { error: true, message: 'Internal server failure during binary deploy' });
		}
	},

	deleteRelease: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { error: true, message: 'Missing ID' });

		try {
			// Fetch the record to get CDN path info
			const release = await db.query.aceBlockerInstaller.findFirst({
				where: eq(aceBlockerInstaller.id, id)
			});

			if (release) {
				const folderPath = `ace-blocker-installer/${release.version}`;
				const endpointUrl = `https://storage.bunnycdn.com/${BUNNY_STORAGE_ZONE}/${folderPath}/${release.fileName}`;

				await fetch(endpointUrl, {
					method: 'DELETE',
					headers: { 'AccessKey': BUNNY_STORAGE_ACCESS_KEY }
				});
			}

			await db.delete(aceBlockerInstaller).where(eq(aceBlockerInstaller.id, id));
			await invalidateCache();
			return { success: true, message: 'Release and CDN assets deleted successfully' };
		} catch (e) {
			console.error(e);
			return fail(500, { error: true, message: 'Delete failed' });
		}
	}
};
