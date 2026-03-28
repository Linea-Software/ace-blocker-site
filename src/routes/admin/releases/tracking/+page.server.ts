import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadTrackingScripts, deleteTrackingScripts, CDNErrorType } from '$lib/server/cdn';
import { invalidateTrackingCache } from '$lib/server/cache';

export const load: PageServerLoad = async () => {
	const releases = await db
		.select()
		.from(trackingScripts)
		.orderBy(desc(trackingScripts.createdAt));
	const stats = await db
		.select({
			total: sql<number>`CAST(SUM(${trackingScripts.downloadCount}) AS INTEGER)`
		})
		.from(trackingScripts);

	return {
		releases,
		totalDownloads: stats[0]?.total || 0
	};
};

export const actions: Actions = {
	uploadRelease: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;

		if (!file || !file.size || !version) {
			return fail(400, {
				error: true,
				message: 'Missing required configuration for deploy (File or Version)'
			});
		}

		const result = await uploadTrackingScripts(file, version);

		if (result.isErr()) {
			const errorType = result.error;
			let message = 'Internal server failure during binary deploy';

			if (errorType === CDNErrorType.UploadFailed) {
				message = 'Storage deploy failed at CDN network border';
			} else if (errorType === CDNErrorType.NetworkFailure) {
				message = 'Network failure during upload';
			}

			return fail(500, {
				error: true,
				message
			});
		}

		return { success: true, message: 'Deployment to CDN and database successful' };
	},

	deleteRelease: async ({ request }) => {
		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) return fail(400, { error: true, message: 'Missing ID' });

		try {
			const release = await db.query.trackingScripts.findFirst({
				where: eq(trackingScripts.id, id)
			});

			if (release) {
				const deleteResult = await deleteTrackingScripts(release.version, release.fileName);

				if (deleteResult.isErr()) {
					console.error('Failed to delete from CDN:', deleteResult.error);
					return fail(500, {
						error: true,
						message: 'Failed to delete file from CDN'
					});
				}

				await db.delete(trackingScripts).where(eq(trackingScripts.id, id));
				await invalidateTrackingCache();
				return { success: true, message: 'Release and CDN assets deleted successfully' };
			}

			return fail(404, { error: true, message: 'Release not found' });
		} catch (e) {
			console.error(e);
			return fail(500, { error: true, message: 'Delete failed' });
		}
	}
};
