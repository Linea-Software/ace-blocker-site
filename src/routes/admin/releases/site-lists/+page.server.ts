import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import crypto from 'crypto';
import { uploadSiteList, deleteSiteList, CDNErrorType } from '$lib/server/cdn';
import { invalidateSiteListsCache } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	const siteLists = await db.select().from(siteList).orderBy(desc(siteList.updatedAt));
	const stats = await db
		.select({
			total: sql<number>`CAST(SUM(${siteList.downloadCount}) AS INTEGER)`
		})
		.from(siteList);

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
		const id = (formData.get('id') as string) || crypto.randomUUID();
		const requiresProSubscription = formData.get('requiresProSubscription') === 'true';

		if (!file || !file.size || !name) {
			return fail(400, {
				error: true,
				message: 'Missing required configuration for deploy (File or Name)'
			});
		}

		const result = await uploadSiteList(file, name, id, requiresProSubscription);

		if (result.isErr()) {
			const errorType = result.error;
			let message = 'Internal server failure during binary deploy';

			if (errorType === CDNErrorType.UploadFailed) {
				message = 'BunnyCDN deployment failed.';
			} else if (errorType === CDNErrorType.NetworkFailure) {
				message = 'Network failure during upload';
			}

			return fail(500, {
				error: true,
				message
			});
		}

		return {
			success: true,
			message: 'Deployment to CDN and Database overwrite successful'
		};
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
			await db
				.update(siteList)
				.set({
					name,
					requiresProSubscription,
					updatedAt: sql`CURRENT_TIMESTAMP`
				})
				.where(eq(siteList.id, id));

			await invalidateSiteListsCache();
			return { success: true, message: 'Site list updated successfully' };
		} catch (e) {
			console.error('Update error:', e);
			return fail(500, { error: true, message: 'Failed to update site list' });
		}
	},

	deleteRelease: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: true, message: 'Missing ID for deletion' });
		}

		const deleteResult = await deleteSiteList(id);

		if (deleteResult.isErr()) {
			console.error('Failed to delete site list:', deleteResult.error);
			return fail(500, {
				error: true,
				message: 'Failed to delete site list'
			});
		}

		return { success: true, message: 'Site list and CDN assets deleted successfully' };
	}
};
