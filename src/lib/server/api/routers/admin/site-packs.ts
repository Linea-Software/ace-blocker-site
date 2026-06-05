import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { uploadSitePack, deleteSitePack, CDNErrorType } from '$lib/server/cdn';
import { invalidateSitePacksCache } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:admin:site-packs');

export const sitePacksRouter = new Elysia({ prefix: '/site-packs' })
	.get(
		'/',
		async () => {
			const sitePacks = await db.select().from(sitePack).orderBy(desc(sitePack.updatedAt));
			const stats = await db
				.select({
					total: sql<number>`CAST(SUM(${sitePack.downloadCount}) AS INTEGER)`
				})
				.from(sitePack);

			return {
				sitePacks,
				totalDownloads: stats[0]?.total || 0
			};
		},
		{
			detail: {
				operationId: 'getSitePacks',
				summary: 'Get all site packs with download stats',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					sitePacks: t.Array(t.Any()),
					totalDownloads: t.Number()
				}),
				403: t.String()
			}
		}
	)
	.post(
		'/upload',
		async ({ body, set }) => {
			const { file, name, id, requiresProSubscription } = body;

			if (!file || !file.size || !name || !id) {
				set.status = 400;
				return {
					error: true,
					message: 'Missing required configuration for deploy (File, Name, or ID)'
				};
			}

			// Convert to boolean if it's a string
			const isPro =
				typeof requiresProSubscription === 'string'
					? requiresProSubscription === 'true'
					: requiresProSubscription;

			const result = await uploadSitePack(file, name, id, isPro);

			if (result.isErr()) {
				const errorType = result.error;
				let message = 'Internal server failure during binary deploy';

				if (errorType === CDNErrorType.UploadFailed) {
					message = 'BunnyCDN deployment failed.';
					set.status = 500;
				} else if (errorType === CDNErrorType.NetworkFailure) {
					message = 'Network failure during upload';
					set.status = 500;
				} else {
					set.status = 500;
				}

				return { error: true, message };
			}

			return {
				success: true,
				message: 'Deployment to CDN and Database overwrite successful'
			};
		},
		{
			body: t.Object({
				file: t.File(),
				name: t.String(),
				id: t.String(),
				requiresProSubscription: t.Union([t.Boolean(), t.String()])
			}),
			detail: {
				operationId: 'uploadSitePack',
				summary: 'Upload a new site pack release',
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
		'/update',
		async ({ body, set }) => {
			const { id, name, requiresProSubscription } = body;

			if (!id || !name) {
				set.status = 400;
				return { error: true, message: 'Missing required fields' };
			}

			try {
				await db
					.update(sitePack)
					.set({
						name,
						requiresProSubscription,
						updatedAt: sql`CURRENT_TIMESTAMP`
					})
					.where(eq(sitePack.id, id));

				await invalidateSitePacksCache();
				return { success: true, message: 'Site pack updated successfully' };
			} catch (e) {
				log.error({ err: e }, 'Failed to update site pack');
				set.status = 500;
				return { error: true, message: 'Failed to update site pack' };
			}
		},
		{
			body: t.Object({
				id: t.String(),
				name: t.String(),
				requiresProSubscription: t.Boolean()
			}),
			detail: {
				operationId: 'updateSitePack',
				summary: 'Update an existing site pack',
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
				return { error: true, message: 'Missing ID for deletion' };
			}

			const deleteResult = await deleteSitePack(id);

			if (deleteResult.isErr()) {
				log.error({ err: deleteResult.error }, 'Failed to delete site pack');
				set.status = 500;
				return { error: true, message: 'Failed to delete site pack' };
			}

			return { success: true, message: 'Site pack and CDN assets deleted successfully' };
		},
		{
			body: t.Object({
				id: t.String()
			}),
			detail: {
				operationId: 'deleteSitePack',
				summary: 'Delete a site pack',
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
