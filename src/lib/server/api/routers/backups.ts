import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { backups } from '$lib/server/db/schema';
import { isUserPro } from '$lib/server/pro';
import { v7 as uuidv7 } from 'uuid';

const BackupSitesListSourceSchema = t.Object({
	source: t.String(),
	sourceType: t.String(),
	format: t.String()
});

const BackupSitesListSchema = t.Object({
	id: t.String({ format: 'uuid' }),
	name: t.String(),
	description: t.Nullable(t.String()),
	sources: t.Array(BackupSitesListSourceSchema)
});

const BackupScheduleEntrySchema = t.Object({
	startTime: t.String(),
	endTime: t.String(),
	monday: t.Boolean(),
	tuesday: t.Boolean(),
	wednesday: t.Boolean(),
	thursday: t.Boolean(),
	friday: t.Boolean(),
	saturday: t.Boolean(),
	sunday: t.Boolean()
});

const BackupNetworkBlockSchema = t.Object({
	id: t.String({ format: 'uuid' }),
	name: t.String(),
	safe_search: t.Boolean(),
	schedules: t.Array(BackupScheduleEntrySchema),
	userRules: t.Array(t.String()),
	connectedSitesLists: t.Array(t.String({ format: 'uuid' }))
});

const EngineBackupSchema = t.Object({
	version: t.String(),
	customSitesLists: t.Array(BackupSitesListSchema),
	networkBlocks: t.Array(BackupNetworkBlockSchema),
	deactivatedResistanceModeScripts: t.Array(t.String())
});

export const backupsRouter = new Elysia({ prefix: '/backups' })
	.derive(async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});
		return {
			user: session?.user ?? null,
			session: session?.session ?? null
		};
	})
	.post(
		'/',
		async ({ user, request, body, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const isPro = await isUserPro(user.id);
			if (!isPro) {
				return status(403, 'Pro license required');
			}

			// Check payload size
			const contentLength = request.headers.get('content-length');
			if (contentLength && parseInt(contentLength) > 1024 * 1024) {
				return status(413, 'Backup size exceeds 1MB');
			}

			const backupId = uuidv7();
			await db
				.insert(backups)
				.values({
					id: backupId,
					userId: user.id,
					data: JSON.stringify(body),
					version: body.version,
					createdAt: new Date()
				})
				.onConflictDoUpdate({
					target: backups.userId,
					set: {
						data: JSON.stringify(body),
						version: body.version,
						createdAt: new Date()
					}
				});

			return { id: backupId };
		},
		{
			body: EngineBackupSchema,
			detail: {
				operationId: 'createBackup',
				summary: 'Create a new engine backup',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					id: t.String({ format: 'uuid' })
				}),
				401: t.String(),
				403: t.String(),
				413: t.String(),
				500: t.String()
			}
		}
	)
	.get(
		'/',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const isPro = await isUserPro(user.id);
			if (!isPro) {
				return status(403, 'Pro license required');
			}

			const [latestBackup] = await db
				.select()
				.from(backups)
				.where(eq(backups.userId, user.id))
				.orderBy(desc(backups.createdAt))
				.limit(1);

			if (!latestBackup) {
				return status(404, 'No backup found');
			}

			return JSON.parse(latestBackup.data);
		},
		{
			detail: {
				operationId: 'fetchBackup',
				summary: 'Fetch the latest engine backup',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: EngineBackupSchema,
				401: t.String(),
				403: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	);
