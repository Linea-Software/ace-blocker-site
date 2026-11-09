import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { aceBlockerInstaller } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { uploadInstaller, deleteInstaller, CDNErrorType } from '$lib/server/cdn';
import { invalidateInstallerCache } from '$lib/server/cache';
import crypto from 'crypto';
import { createLogger } from '$lib/server/logger';
import { validateInstallerArtifact } from '$lib/server/installer-artifact-validation';

const log = createLogger('api:admin:installers');

export const installersRouter = new Elysia({ prefix: '/installers' })
	.get(
		'/',
		async () => {
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
		},
		{
			detail: {
				operationId: 'getInstallers',
				summary: 'Get all installers with download stats',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					installers: t.Array(t.Any()),
					totalDownloads: t.Number()
				}),
				403: t.String()
			}
		}
	)
	.post(
		'/upload',
		async ({ body, set, request }) => {
			const { file, version, os, architecture } = body;

			if (!file || !file.size || !version) {
				log.error(
					{
						hasFile: !!file,
						fileSize: file?.size,
						version,
						hasOs: !!os,
						hasArchitecture: !!architecture,
						contentType: request.headers.get('content-type'),
						method: request.method,
						path: request.url
					},
					'Upload validation failed'
				);
				set.status = 400;
				return {
					error: true,
					message: 'Missing required configuration for deploy (File or Version)'
				};
			}

			const invalid = await validateInstallerArtifact(file, version, os, architecture);
			if (invalid) {
				set.status = 400;
				return { error: true, message: invalid };
			}

			const result = await uploadInstaller(
				file,
				version,
				os as 'windows' | 'linux' | 'macos',
				architecture as 'x64' | 'arm64',
				false
			);

			if (result.isErr()) {
				const errorType = result.error;
				let message = 'Internal server failure during binary deploy';

				if (errorType === CDNErrorType.UploadFailed) {
					message = 'Storage deploy failed at CDN network border';
					set.status = 500;
				} else if (errorType === CDNErrorType.NetworkFailure) {
					message = 'Network failure during upload';
					set.status = 500;
				} else if (errorType === CDNErrorType.InvalidArtifact) {
					message = 'File type or contents did not pass validation';
					set.status = 400;
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
				version: t.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
				os: t.Union([t.Literal('windows'), t.Literal('linux')]),
				architecture: t.Literal('x64')
			}),
			detail: {
				operationId: 'uploadInstaller',
				summary: 'Upload a new installer release',
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
		'/set-downloadable',
		async ({ body, set }) => {
			// Release lifecycle: `canBeDownloaded = false` withdraws a release
			// from the "latest" selection (both /releases/latest metadata and
			// the /download route stop serving it). Engines that already
			// downloaded the release keep their local files — this is not a
			// revocation of installed content.
			const { id, canBeDownloaded } = body;

			if (!id) {
				set.status = 400;
				return { error: true, message: 'Missing ID' };
			}

			const existing = await db.query.aceBlockerInstaller.findFirst({
				where: eq(aceBlockerInstaller.id, id)
			});
			if (!existing) {
				set.status = 404;
				return { error: true, message: 'Release not found' };
			}

			// Legacy manual download toggle is NOT a signed-update approval.
			// Signed releases must go through the audited publish/withdraw transitions.
			if (existing.updateState && existing.updateState !== 'legacy') {
				set.status = 409;
				return {
					error: true,
					message: 'Use the signed desktop release publication workflow'
				};
			}

			// The legacy toggle can withdraw old releases, but cannot authorize a
			// new public release. The signed Windows publish/withdraw transaction
			// is the only authority for the complete Windows + Linux pair.
			if (canBeDownloaded) {
				set.status = 409;
				return {
					error: true,
					message: 'Publish a signed Windows release with a verified Linux companion'
				};
			}
			if (existing.os === 'linux') {
				const publishedWindows = await db.query.aceBlockerInstaller.findFirst({
					where: (installer, { and, eq }) =>
						and(
							eq(installer.version, existing.version),
							eq(installer.os, 'windows'),
							eq(installer.architecture, 'x64'),
							eq(installer.updateState, 'published')
						)
				});
				if (publishedWindows) {
					set.status = 409;
					return {
						error: true,
						message: 'Withdraw the signed Windows release to withdraw both platforms'
					};
				}
			}

			await db
				.update(aceBlockerInstaller)
				.set({ canBeDownloaded })
				.where(eq(aceBlockerInstaller.id, id));
			await invalidateInstallerCache();

			log.info({ id, canBeDownloaded }, 'Updated installer release downloadability');

			return { success: true, message: 'Release downloadability updated' };
		},
		{
			body: t.Object({
				id: t.String(),
				canBeDownloaded: t.Boolean()
			}),
			detail: {
				operationId: 'setInstallerDownloadable',
				summary: 'Withdraw or restore an installer release from the latest selection',
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
				409: t.Object({ error: t.Boolean(), message: t.String() }),
				404: t.Object({
					error: t.Boolean(),
					message: t.String()
				}),
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

			const deleteResult = await deleteInstaller(id);

			if (deleteResult.isErr()) {
				log.error({ err: deleteResult.error }, 'Failed to delete installer');
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
				operationId: 'deleteInstaller',
				summary: 'Delete an installer',
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
