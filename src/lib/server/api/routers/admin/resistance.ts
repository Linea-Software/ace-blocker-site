import { Elysia, t } from 'elysia';
import { db } from '$lib/server/db';
import { resistanceModeScripts } from '$lib/server/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import {
	uploadResistanceModeScript,
	deleteResistanceModeScript,
	CDNErrorType,
	isValidArtifactFile,
	isValidArtifactVersion,
	MAX_ARTIFACT_SIZE
} from '$lib/server/cdn';
import { invalidateResistanceCache } from '$lib/server/cache';
import crypto from 'crypto';
import { createLogger } from '$lib/server/logger';
import {
	getBoredomEngineImportStatus,
	importBoredomEngineRelease
} from '$lib/server/boredom-engine-release';

const log = createLogger('api:admin:resistance');

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
	.get('/github-import-status', () => getBoredomEngineImportStatus(), {
		detail: {
			operationId: 'getBoredomEngineReleaseImportStatus',
			summary: 'Read the latest Boredom Engine GitHub import status',
			security: [{ APIKeyHeader: [] }]
		},
		response: {
			200: t.Object({
				running: t.Boolean(),
				lastStartedAt: t.Nullable(t.String()),
				lastCompletedAt: t.Nullable(t.String()),
				lastError: t.Nullable(t.String()),
				lastResult: t.Nullable(
					t.Object({
						release: t.String(),
						version: t.String(),
						sha256: t.String(),
						imported: t.Boolean()
					})
				)
			}),
			403: t.String()
		}
	})
	.post(
		'/github-import',
		({ set }) => {
			if (getBoredomEngineImportStatus().running) {
				set.status = 409;
				return { error: true, message: 'A Boredom Engine import is already running' };
			}
			// Downloading the verified ZIP and uploading to the CDN may take time.
			void importBoredomEngineRelease().catch((error: unknown) => {
				log.error({ err: error }, 'Manual Boredom Engine GitHub import failed');
			});
			set.status = 202;
			return { started: true };
		},
		{
			detail: {
				operationId: 'importBoredomEngineRelease',
				summary: 'Import the latest Boredom Engine GitHub release as staged',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				202: t.Object({ started: t.Boolean() }),
				403: t.String(),
				409: t.Object({ error: t.Boolean(), message: t.String() })
			}
		}
	)
	.post(
		'/upload',
		async ({ body, set }) => {
			const { file, version } = body;

			// Application-level validation (nginx limits alone are not a
			// contract): size cap, zip file type, and a safe version string.
			// `version` becomes a CDN object path segment and a DB value —
			// traversal/unsafe characters are rejected outright.
			if (!file || !version) {
				set.status = 400;
				return {
					error: true,
					message: 'Missing required configuration for deploy (File or Version)'
				};
			}
			if (!isValidArtifactVersion(version)) {
				set.status = 400;
				return {
					error: true,
					message:
						`Invalid version '${version}': use 1-64 URL-safe characters ` +
						'([A-Za-z0-9._-], no slashes or traversal)'
				};
			}
			if (file.size <= 0) {
				set.status = 400;
				return { error: true, message: 'The uploaded file is empty' };
			}
			if (file.size > MAX_ARTIFACT_SIZE) {
				set.status = 400;
				return {
					error: true,
					message: `The uploaded file exceeds the ${MAX_ARTIFACT_SIZE / (1024 * 1024)} MB upload limit`
				};
			}
			if (!(await isValidArtifactFile(file, { zip: true }))) {
				set.status = 400;
				return { error: true, message: 'The uploaded file is not a valid zip archive' };
			}

			const result = await uploadResistanceModeScript(file, version, false);

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
					message = 'Artifact rejected: invalid version or file';
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
		'/set-downloadable',
		async ({ body, set }) => {
			// Release lifecycle: `canBeDownloaded = false` withdraws a release
			// from the "latest" selection (both /releases/latest metadata and
			// the signed download URL stop serving it). Engines that already
			// downloaded the release keep their local files — this is not a
			// revocation of installed content. Old releases stay downloadable
			// until an explicit retention policy decides otherwise.
			const { id, canBeDownloaded } = body;

			if (!id) {
				set.status = 400;
				return { error: true, message: 'Missing ID' };
			}

			const existing = await db.query.resistanceModeScripts.findFirst({
				where: eq(resistanceModeScripts.id, id)
			});
			if (!existing) {
				set.status = 404;
				return { error: true, message: 'Release not found' };
			}

			await db
				.update(resistanceModeScripts)
				.set({ canBeDownloaded })
				.where(eq(resistanceModeScripts.id, id));
			await invalidateResistanceCache();

			log.info({ id, canBeDownloaded }, 'Updated resistance release downloadability');

			return { success: true, message: 'Release downloadability updated' };
		},
		{
			body: t.Object({
				id: t.String(),
				canBeDownloaded: t.Boolean()
			}),
			detail: {
				operationId: 'setResistanceScriptDownloadable',
				summary: 'Withdraw or restore a resistance release from the latest selection',
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

			const deleteResult = await deleteResistanceModeScript(id);

			if (deleteResult.isErr()) {
				log.error({ err: deleteResult.error }, 'Failed to delete resistance script');
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
