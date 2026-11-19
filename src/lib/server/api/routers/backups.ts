import { Elysia, t } from 'elysia';
import { eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { backups } from '$lib/server/db/schema';
import { isUserPro } from '$lib/server/pro';
import { v7 as uuidv7 } from 'uuid';

// New backups are always encrypted before reaching this API. The server
// persists only the ciphertext, Argon2id salt and AES-GCM nonce in separate
// database columns. The format is fixed to v1 until a coordinated upgrade.
const Base64 = t.String({ pattern: '^[A-Za-z0-9+/]+={0,2}$' });
export const EncryptedCloudBackupSchema = t.Object(
	{
		format: t.Literal('ace-cloud-e2ee'),
		formatVersion: t.Literal(1),
		algorithm: t.Literal('aes-256-gcm'),
		kdf: t.Literal('argon2id'),
		salt: Base64,
		nonce: Base64,
		ciphertext: Base64
	},
	{ additionalProperties: false }
);

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

			// Exact binary lengths and a minimum AES-GCM tag; no expensive KDF
			// work or plaintext access is performed by this server.
			const salt = Buffer.from(body.salt, 'base64');
			const nonce = Buffer.from(body.nonce, 'base64');
			const ciphertext = Buffer.from(body.ciphertext, 'base64');
			if (
				salt.length !== 16 ||
				nonce.length !== 12 ||
				ciphertext.length < 16 ||
				salt.toString('base64') !== body.salt ||
				nonce.toString('base64') !== body.nonce ||
				ciphertext.toString('base64') !== body.ciphertext
			) {
				return status(400, 'Invalid encrypted backup envelope');
			}
			const wireBytes = Buffer.byteLength(JSON.stringify(body), 'utf8');
			if (wireBytes > 2 * 1024 * 1024) {
				return status(413, 'Backup size exceeds 2MB');
			}

			const backupId = uuidv7();
			await db
				.insert(backups)
				.values({
					id: backupId,
					userId: user.id,
					data: body.ciphertext,
					salt: body.salt,
					nonce: body.nonce,
					version: 'e2ee-v1',
					createdAt: new Date()
				})
				.onConflictDoUpdate({
					target: backups.userId,
					set: {
						data: body.ciphertext,
						salt: body.salt,
						nonce: body.nonce,
						version: 'e2ee-v1',
						createdAt: new Date()
					}
				});

			return { id: backupId };
		},
		{
			body: EncryptedCloudBackupSchema,
			detail: {
				operationId: 'createBackup',
				summary: 'Create a new engine backup',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					id: t.String({ format: 'uuid' })
				}),
				400: t.String(),
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

			// The API reassembles the wire envelope. PostgreSQL never contains an
			// embedded JSON object with salt/nonce duplicated inside `data`.
			return {
				format: 'ace-cloud-e2ee' as const,
				formatVersion: 1 as const,
				algorithm: 'aes-256-gcm' as const,
				kdf: 'argon2id' as const,
				salt: latestBackup.salt,
				nonce: latestBackup.nonce,
				ciphertext: latestBackup.data
			};
		},
		{
			detail: {
				operationId: 'fetchBackup',
				summary: 'Fetch the latest engine backup',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: EncryptedCloudBackupSchema,
				401: t.String(),
				403: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	);
