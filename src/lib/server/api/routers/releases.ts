import { Elysia, t } from 'elysia';
import { and, eq } from 'drizzle-orm';
import crypto from 'crypto';
import { getLatestInstaller, getLatestResistanceScript, getLatestSitePacks } from '../../cache';
import { createLogger } from '$lib/server/logger';
import { db } from '$lib/server/db';
import { aceBlockerInstaller } from '$lib/server/db/schema';
import { CDNErrorType, getArrayBufferChecksum, uploadInstaller } from '$lib/server/cdn';

const log = createLogger('api:releases');

function sitePackVersion(updatedAt: Date): string {
	const year = updatedAt.getUTCFullYear();
	const month = String(updatedAt.getUTCMonth() + 1).padStart(2, '0');
	const day = String(updatedAt.getUTCDate()).padStart(2, '0');
	return `${year}.${month}.${day}`;
}

function hasValidReleaseIngestToken(request: Request, expectedToken: string): boolean {
	const authorization = request.headers.get('authorization');
	if (!authorization?.startsWith('Bearer ')) return false;

	const suppliedToken = authorization.slice('Bearer '.length);
	const expected = Buffer.from(expectedToken);
	const supplied = Buffer.from(suppliedToken);
	return expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied);
}

export const releasesRouter = new Elysia({ prefix: '/releases' })
	.get(
		'/latest',
		async ({ status }) => {
			try {
				const installer = getLatestInstaller();
				const resistance = getLatestResistanceScript();
				const sitePacks = getLatestSitePacks();

				// Strip file paths, keeping only version and basic metadata
				return {
					installer: installer
						? {
								version: installer.version,
								size: installer.size,
								os: installer.os,
								architecture: installer.architecture,
								createdAt: installer.createdAt
							}
						: null,
					resistance: resistance
						? {
								version: resistance.version,
								size: resistance.size,
								sha256: resistance.sha256,
								createdAt: resistance.createdAt
							}
						: null,
					sitePacks: Array.from(sitePacks.entries()).map(([id, pack]) => ({
						id,
						name: pack.name,
						description: `Site pack package: ${pack.name}`,
						requiresPro: pack.requiresProSubscription,
						version: sitePackVersion(pack.updatedAt),
						size: pack.size,
						updatedAt: pack.updatedAt
					}))
				};
			} catch (e) {
				log.error({ err: e }, 'Failed to fetch latest releases cache');
				return status(500, 'Internal Server Error');
			}
		},
		{
			detail: {
				operationId: 'getLatestReleasesVersionData',
				summary: 'Get metadata for the latest software releases directly from cache',
				security: []
			},
			response: {
				200: t.Object({
					installer: t.Nullable(
						t.Object({
							version: t.String(),
							size: t.Number(),
							os: t.String(),
							architecture: t.String(),
							createdAt: t.Date()
						})
					),
					resistance: t.Nullable(
						t.Object({
							version: t.String(),
							size: t.Number(),
							sha256: t.String(),
							createdAt: t.Date()
						})
					),
					sitePacks: t.Array(
						t.Object({
							id: t.String(),
							name: t.String(),
							description: t.String(),
							requiresPro: t.Boolean(),
							version: t.String(),
							size: t.Number(),
							updatedAt: t.Date()
						})
					)
				}),
				500: t.String()
			}
		}
	)
	.post(
		'/ingest/installer',
		async ({ body, request, status }) => {
			const expectedToken = process.env.ACE_RELEASE_INGEST_TOKEN;
			if (!expectedToken) {
				log.warn('Release ingest attempted while ACE_RELEASE_INGEST_TOKEN is unset');
				return status(503, { error: true, message: 'Release ingest is disabled' });
			}
			if (!hasValidReleaseIngestToken(request, expectedToken)) {
				return status(401, { error: true, message: 'Unauthorized' });
			}

			const {
				file,
				version,
				os,
				architecture,
				sha256,
				sourceRepository,
				sourceCommit,
				sourceRunId,
				sourceRunUrl,
				engineCommit,
				appCommit
			} = body;

			if (!file.name.toLowerCase().endsWith('.msi')) {
				return status(400, { error: true, message: 'Installer candidate must be an MSI file' });
			}

			const existing = await db.query.aceBlockerInstaller.findFirst({
				where: and(
					eq(aceBlockerInstaller.version, version),
					eq(aceBlockerInstaller.os, os),
					eq(aceBlockerInstaller.architecture, architecture)
				)
			});
			if (existing) {
				return status(409, {
					error: true,
					message: `Installer ${version} for ${os}/${architecture} already exists; release versions are immutable`
				});
			}

			const computedSha256 = getArrayBufferChecksum(await file.arrayBuffer());
			if (computedSha256 !== sha256.toLowerCase()) {
				log.warn(
					{ version, sourceRepository, sourceCommit, expectedSha256: sha256, computedSha256 },
					'Rejected installer candidate with mismatched checksum'
				);
				return status(400, { error: true, message: 'Installer SHA-256 does not match the submitted checksum' });
			}

			const result = await uploadInstaller(file, version, os, architecture, false, {
				sourceRepository,
				sourceCommit,
				sourceRunId,
				sourceRunUrl,
				engineCommit,
				appCommit
			});
			if (result.isErr()) {
				const errorType = result.error;
				const responseStatus = errorType === CDNErrorType.InvalidArtifact ? 400 : 500;
				log.error(
					{ errorType, version, sourceRepository, sourceCommit },
					'Failed to ingest installer release candidate'
				);
				return status(responseStatus, {
					error: true,
					message:
						errorType === CDNErrorType.InvalidArtifact
							? 'Installer candidate failed artifact validation'
							: 'Failed to store installer candidate'
				});
			}

			const stored = result._unsafeUnwrap();
			log.info(
				{ version, os, architecture, sha256: stored.hash, sourceRepository, sourceCommit },
				'Stored staged installer release candidate'
			);
			return {
				success: true,
				message: 'Installer candidate staged for admin review',
				sha256: stored.hash
			};
		},
		{
			body: t.Object({
				file: t.File(),
				version: t.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
				os: t.Union([t.Literal('windows'), t.Literal('linux'), t.Literal('macos')]),
				architecture: t.Union([t.Literal('x64'), t.Literal('arm64')]),
				sha256: t.String({ pattern: '^[0-9a-fA-F]{64}$' }),
				sourceRepository: t.String({ minLength: 1, maxLength: 200 }),
				sourceCommit: t.String({ pattern: '^[0-9a-fA-F]{7,64}$' }),
				sourceRunId: t.String({ minLength: 1, maxLength: 64 }),
				sourceRunUrl: t.String({ minLength: 1, maxLength: 500 }),
				engineCommit: t.String({ pattern: '^[0-9a-fA-F]{7,64}$' }),
				appCommit: t.String({ pattern: '^[0-9a-fA-F]{7,64}$' })
			}),
			detail: {
				operationId: 'ingestInstallerReleaseCandidate',
				summary: 'Accept a checksum-verified staged installer candidate from CI',
				security: []
			},
			response: {
				200: t.Object({ success: t.Boolean(), message: t.String(), sha256: t.String() }),
				400: t.Object({ error: t.Boolean(), message: t.String() }),
				401: t.Object({ error: t.Boolean(), message: t.String() }),
				409: t.Object({ error: t.Boolean(), message: t.String() }),
				500: t.Object({ error: t.Boolean(), message: t.String() }),
				503: t.Object({ error: t.Boolean(), message: t.String() })
			}
		}
	);
