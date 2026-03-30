import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { uploadSiteList, deleteSiteList, CDNErrorType } from '$lib/server/cdn';
import { invalidateSiteListsCache } from '$lib/server/cache';

export const siteListsRouter = new Elysia({ prefix: '/site-lists' })
	.get(
		'/',
		async () => {
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
		},
		{
			detail: {
				operationId: 'getSiteLists',
				summary: 'Get all site lists with download stats',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					siteLists: t.Array(t.Any()),
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

			const result = await uploadSiteList(file, name, id, isPro);

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
				operationId: 'uploadSiteList',
				summary: 'Upload a new site list release',
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
				set.status = 500;
				return { error: true, message: 'Failed to update site list' };
			}
		},
		{
			body: t.Object({
				id: t.String(),
				name: t.String(),
				requiresProSubscription: t.Boolean()
			}),
			detail: {
				operationId: 'updateSiteList',
				summary: 'Update an existing site list',
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

			const deleteResult = await deleteSiteList(id);

			if (deleteResult.isErr()) {
				console.error('Failed to delete site list:', deleteResult.error);
				set.status = 500;
				return { error: true, message: 'Failed to delete site list' };
			}

			return { success: true, message: 'Site list and CDN assets deleted successfully' };
		},
		{
			body: t.Object({
				id: t.String()
			}),
			detail: {
				operationId: 'deleteSiteList',
				summary: 'Delete a site list',
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
