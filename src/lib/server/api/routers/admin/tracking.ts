import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { trackingScripts } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { uploadTrackingScripts, deleteTrackingScripts, CDNErrorType } from '$lib/server/cdn';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:admin:tracking');

export const trackingRouter = new Elysia({ prefix: '/tracking' })
	.get(
		'/',
		async () => {
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
		},
		{
			detail: {
				operationId: 'getTrackingScripts',
				summary: 'Get all tracking scripts with download stats',
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

			const result = await uploadTrackingScripts(file, version);

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
				operationId: 'uploadTrackingScript',
				summary: 'Upload a new tracking script',
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

			const deleteResult = await deleteTrackingScripts(id);

			if (deleteResult.isErr()) {
				log.error({ err: deleteResult.error }, 'Failed to delete tracking script');
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
				operationId: 'deleteTrackingScript',
				summary: 'Delete a tracking script',
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
