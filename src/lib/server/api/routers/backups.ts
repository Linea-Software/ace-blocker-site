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

// Site-pack ids are NOT server-side UUIDs: built-in/default packs use the
// canonical catalog id (`pack-adult-free`, `pack-social-free`, ...), engine
// rows created from the server list use the server's catalog string, and only
// user-created packs carry a UUID. The site stores the backup blob verbatim
// and never treats these ids as its own foreign keys, so any non-empty string
// is valid (see engine issue: "UUID failure during cloud backup").
const PackIdString = t.String({ minLength: 1, maxLength: 128 });

const BackupSitesListSchema = t.Object({
	id: PackIdString,
	// Remote linkage/tier are preserved so a restore re-creates a
	// server-managed pack as a remote row (matched by the content updater),
	// not as a local pack. Optional for legacy backups.
	remoteId: t.Optional(t.Nullable(t.String())),
	requiresPro: t.Optional(t.Boolean()),
	version: t.Optional(t.Nullable(t.String())),
	name: t.String(),
	description: t.Optional(t.Nullable(t.String())),
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
	icon: t.Optional(t.Nullable(t.String())),
	schedules: t.Array(BackupScheduleEntrySchema),
	userRules: t.Array(t.String()),
	// A block may reference built-in packs by their canonical catalog id
	// (not a UUID), so connected list ids are opaque strings too.
	connectedSitesLists: t.Array(PackIdString)
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

			// Check payload size — 2MB limit
			const contentLength = request.headers.get('content-length');
			if (contentLength && parseInt(contentLength) > 2 * 1024 * 1024) {
				return status(413, 'Backup size exceeds 2MB');
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
