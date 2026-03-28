import { db } from '$lib/server/db';
import { aceBlockerInstaller } from '$lib/server/db/schema';
import { desc, sql, eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import { uploadInstaller, deleteInstaller, CDNErrorType } from '$lib/server/cdn';

export const load: PageServerLoad = async () => {
	const installers = await db
		.select()
		.from(aceBlockerInstaller)
		.orderBy(desc(aceBlockerInstaller.createdAt));
	const stats = await db
		.select({
			total: sql<number>`CAST(SUM(${aceBlockerInstaller.downloadCount}) AS INTEGER)`
		})
		.from(aceBlockerInstaller);

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
			return fail(400, {
				error: true,
				message: 'Missing required configuration for deploy (File or Version)'
			});
		}

		const result = await uploadInstaller(file, version, os, architecture);

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

		const deleteResult = await deleteInstaller(id);

		if (deleteResult.isErr()) {
			console.error('Failed to delete installer:', deleteResult.error);
			return fail(500, {
				error: true,
				message: 'Delete failed'
			});
		}

		return { success: true, message: 'Release and CDN assets deleted successfully' };
	}
};
