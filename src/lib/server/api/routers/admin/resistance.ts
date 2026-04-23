import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { resistanceModeScripts } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import {
	uploadResistanceModeScript,
	deleteResistanceModeScript,
	CDNErrorType
} from '$lib/server/cdn';
import { invalidateResistanceCache } from '$lib/server/cache';
import crypto from 'crypto';

export const resistanceRouter = new Elysia({ prefix: '/resistance' })
	.get(
		'/',
		async () => {
			const releases = await db
				.select()
				.from(resistanceModeScripts)
				.orderBy(desc(resistanceModeScripts.createdAt));
			const stats = await db
				.select({
					total: sql<number>`CAST(SUM(${resistanceModeScripts.downloadCount}) AS INTEGER)`
				})
				.from(resistanceModeScripts);

			return {
				releases,
				totalDownloads: stats[0]?.total || 0
			};
		},
		{
			detail: {
				operationId: 'getResistanceScripts',
				summary: 'Get all resistance mode scripts with download stats',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					releases: t.Array(t.Any()),
					totalDownloads: t.Number()
				}),
				403: t.String()
			}
		}
	)
	.post(
		'/upload',
		async ({ body, set }) => {
			const { file, version } = body;

			if (!file || !file.size || !version) {
				set.status = 400;
				return {
					error: true,
					message: 'Missing required configuration for deploy (File or Version)'
				};
			}

			const result = await uploadResistanceModeScript(file, version);

			if (result.isErr()) {
				const errorType = result.error;
				let message = 'Internal server failure during binary deploy';

				if (errorType === CDNErrorType.UploadFailed) {
					message = 'Storage deploy failed at CDN network border';
					set.status = 500;
				} else if (errorType === CDNErrorType.NetworkFailure) {
					message = 'Network failure during upload';
					set.status = 500;
				} else {
					set.status = 500;
				}

				return { error: true, message };
			}

			return { success: true, message: 'Deployment to CDN and database successful' };
		},
		{
			body: t.Object({
				file: t.File(),
				version: t.String()
			}),
			detail: {
				operationId: 'uploadResistanceScript',
				summary: 'Upload a new resistance mode script',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean(),
					message: t.String()
				}),
				400: t.Object({
					error: t.Boolean(),
					message: t.String()
				}),
				403: t.String(),
				500: t.Object({
					error: t.Boolean(),
					message: t.String()
				})
			}
		}
	)
	.post(
		'/delete',
		async ({ body, set }) => {
			const { id } = body;

			if (!id) {
				set.status = 400;
				return { error: true, message: 'Missing ID' };
			}

			const deleteResult = await deleteResistanceModeScript(id);

			if (deleteResult.isErr()) {
				console.error('Failed to delete resistance script:', deleteResult.error);
				set.status = 500;
				return { error: true, message: 'Delete failed' };
			}

			return { success: true, message: 'Release and CDN assets deleted successfully' };
		},
		{
			body: t.Object({
				id: t.String()
			}),
			detail: {
				operationId: 'deleteResistanceScript',
				summary: 'Delete a resistance mode script',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean(),
					message: t.String()
				}),
				400: t.Object({
					error: t.Boolean(),
					message: t.String()
				}),
				403: t.String(),
				500: t.Object({
					error: t.Boolean(),
					message: t.String()
				})
			}
		}
	);
