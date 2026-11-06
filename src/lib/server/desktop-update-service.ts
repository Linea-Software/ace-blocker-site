import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { aceBlockerInstaller, desktopReleaseAudit } from '$lib/server/db/schema';
import { installersBasePath } from '$lib/server/cdn/common';
import { invalidateDesktopReleaseCache, invalidateInstallerCache } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';
import {
	DesktopReleaseError,
	MAX_DESKTOP_MSI,
	compareStableVersions,
	verifyDesktopEnvelope,
	type SignedEnvelope
} from './desktop-update-security';
import {
	desktopStageKey,
	promoteDesktopObject,
	removePublishedDesktopObject,
	publishedUrl,
	verifyStoredObject
} from './desktop-update-storage';

const log = createLogger('desktop-update-service');

export interface DesktopIngest {
	envelope: SignedEnvelope;
	stagingKey: string;
	size: number;
	sourceRepository?: string;
	sourceCommit?: string;
	sourceRunId?: string;
	sourceRunUrl?: string;
	engineCommit?: string;
	appCommit?: string;
}

function validateRow(
	row: typeof aceBlockerInstaller.$inferSelect,
	envelope: SignedEnvelope
): ReturnType<typeof verifyDesktopEnvelope> {
	const metadata = verifyDesktopEnvelope(envelope, installersBasePath);
	if (
		row.updateChannel !== metadata.channel ||
		row.version !== metadata.version ||
		row.os !== metadata.os ||
		row.architecture !== metadata.architecture ||
		row.sha256 !== metadata.sha256 ||
		row.downloadUrl !== metadata.packageUrl ||
		row.manifestKeyId !== envelope.key_id ||
		row.stagingKey !== desktopStageKey(metadata.version, metadata.sha256) ||
		row.size <= 0 ||
		row.size > MAX_DESKTOP_MSI ||
		row.fileName !== metadata.sha256 + '.msi'
	)
		throw new DesktopReleaseError(
			'invalid',
			'Stored release metadata does not match the signed payload'
		);
	return metadata;
}

function auditEntry(installerId: string, actor: string, action: string, result: string) {
	return {
		id: randomUUID(),
		installerId,
		actor: actor.slice(0, 200),
		action,
		result
	};
}

export async function stageDesktopRelease(input: DesktopIngest): Promise<string> {
	const metadata = verifyDesktopEnvelope(input.envelope, installersBasePath);
	if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_DESKTOP_MSI)
		throw new DesktopReleaseError('invalid', 'Invalid MSI size');
	const stageKey = desktopStageKey(metadata.version, metadata.sha256);
	if (input.stagingKey !== stageKey)
		throw new DesktopReleaseError('invalid', 'Staging object name is not content-addressed');

	const existing = await db.query.aceBlockerInstaller.findFirst({
		where: and(
			eq(aceBlockerInstaller.version, metadata.version),
			eq(aceBlockerInstaller.os, metadata.os),
			eq(aceBlockerInstaller.architecture, metadata.architecture)
		)
	});
	if (existing)
		throw new DesktopReleaseError('conflict', 'Release target/version is already reserved');

	await verifyStoredObject('staging', metadata.version, metadata.sha256, input.size);

	const id = randomUUID();
	try {
		await db.transaction(async (tx) => {
			await tx.insert(aceBlockerInstaller).values({
				id,
				fileName: metadata.sha256 + '.msi',
				version: metadata.version,
				os: metadata.os,
				architecture: metadata.architecture,
				downloadUrl: publishedUrl(metadata.version, metadata.sha256),
				sha256: metadata.sha256,
				size: input.size,
				canBeDownloaded: false,
				downloadCount: 0,
				sourceRepository: input.sourceRepository,
				sourceCommit: input.sourceCommit,
				sourceRunId: input.sourceRunId,
				sourceRunUrl: input.sourceRunUrl,
				engineCommit: input.engineCommit,
				appCommit: input.appCommit,
				updateChannel: metadata.channel,
				updateState: 'staged',
				signedEnvelope: JSON.stringify(input.envelope),
				manifestKeyId: input.envelope.key_id,
				stagingKey: stageKey
			});
			await tx
				.insert(desktopReleaseAudit)
				.values(auditEntry(id, 'ci:ingest-token', 'stage', 'success'));
		});
	} catch (error) {
		log.warn(
			{ err: error instanceof Error ? error.message : 'unknown', version: metadata.version },
			'Desktop release database reservation failed'
		);
		throw new DesktopReleaseError(
			'conflict',
			'Release already exists or could not be reserved'
		);
	}

	return id;
}

export async function publishDesktopRelease(id: string, adminId: string): Promise<void> {
	// Atomic claim: concurrent admins cannot promote the same object twice.
	let claimed: (typeof aceBlockerInstaller.$inferSelect)[];
	try {
		claimed = await db
			.update(aceBlockerInstaller)
			.set({ updateState: 'publishing' })
			.where(
				and(eq(aceBlockerInstaller.id, id), eq(aceBlockerInstaller.updateState, 'staged'))
			)
			.returning();
	} catch {
		throw new DesktopReleaseError('conflict', 'Another target publication is in progress');
	}
	const row = claimed[0];
	if (!row)
		throw new DesktopReleaseError('conflict', 'Only staged signed releases may be published');

	let promoted = false;
	let committed = false;
	let promotedVersion: string | null = null;
	let promotedSha: string | null = null;
	try {
		if (!row.signedEnvelope)
			throw new DesktopReleaseError('invalid', 'Missing signed envelope');
		let envelope: SignedEnvelope;
		try {
			envelope = JSON.parse(row.signedEnvelope) as SignedEnvelope;
		} catch {
			throw new DesktopReleaseError('invalid', 'Stored envelope cannot be parsed');
		}
		const metadata = validateRow(row, envelope);
		// Fail closed on out-of-order publication, including a previously withdrawn
		// higher release: never resurrect an older vulnerable build.
		const historical = await db
			.select({ version: aceBlockerInstaller.version })
			.from(aceBlockerInstaller)
			.where(
				and(
					eq(aceBlockerInstaller.os, row.os),
					eq(aceBlockerInstaller.architecture, row.architecture),
					eq(aceBlockerInstaller.updateChannel, row.updateChannel!),
					inArray(aceBlockerInstaller.updateState, ['published', 'withdrawn'])
				)
			);
		if (historical.some((other) => compareStableVersions(other.version, row.version) >= 0))
			throw new DesktopReleaseError(
				'conflict',
				'A newer or equal release has already been published'
			);

		await promoteDesktopObject(metadata.version, metadata.sha256, row.size);
		promoted = true;
		promotedVersion = metadata.version;
		promotedSha = metadata.sha256;

		await db.transaction(async (tx) => {
			const updated = await tx
				.update(aceBlockerInstaller)
				.set({ updateState: 'published', canBeDownloaded: true, publishedAt: new Date() })
				.where(
					and(
						eq(aceBlockerInstaller.id, id),
						eq(aceBlockerInstaller.updateState, 'publishing')
					)
				)
				.returning({ id: aceBlockerInstaller.id });
			if (!updated.length)
				throw new DesktopReleaseError('conflict', 'Release publication claim was lost');
			await tx
				.insert(desktopReleaseAudit)
				.values(auditEntry(id, adminId, 'publish', 'success'));
		});
		committed = true;
	} catch (error) {
		if (promoted && !committed && promotedVersion && promotedSha) {
			try {
				await removePublishedDesktopObject(promotedVersion, promotedSha);
			} catch {
				log.error({ id }, 'CDN cleanup needs operator attention after failed publication');
			}
		}
		// No unsigned or partially published row may remain eligible.
		await db
			.update(aceBlockerInstaller)
			.set({ updateState: 'staged', canBeDownloaded: false })
			.where(
				and(
					eq(aceBlockerInstaller.id, id),
					eq(aceBlockerInstaller.updateState, 'publishing')
				)
			)
			.returning({ id: aceBlockerInstaller.id });
		try {
			await db
				.insert(desktopReleaseAudit)
				.values(auditEntry(id, adminId, 'publish', 'failure'));
		} catch {
			log.error({ id }, 'Could not persist publication failure audit');
		}
		throw error;
	}
	// The DB commit is authoritative: a failed cache refresh cannot revert a release.
	// The desktop cache clears before reload and fails closed on a DB outage.
	const refreshed = await Promise.allSettled([
		invalidateDesktopReleaseCache(),
		invalidateInstallerCache()
	]);
	if (refreshed.some((result) => result.status === 'rejected'))
		log.error({ id }, 'Published release awaits cache refresh after DB recovery');
	log.info({ id, adminId }, 'Signed desktop release published');
}

export async function withdrawDesktopRelease(id: string, adminId: string): Promise<void> {
	await db.transaction(async (tx) => {
		const updated = await tx
			.update(aceBlockerInstaller)
			.set({ updateState: 'withdrawn', canBeDownloaded: false })
			.where(
				and(
					eq(aceBlockerInstaller.id, id),
					eq(aceBlockerInstaller.updateState, 'published')
				)
			)
			.returning({ id: aceBlockerInstaller.id });
		if (!updated.length)
			throw new DesktopReleaseError('conflict', 'Only a published release may be withdrawn');
		await tx.insert(desktopReleaseAudit).values(auditEntry(id, adminId, 'withdraw', 'success'));
	});
	await Promise.all([invalidateDesktopReleaseCache(), invalidateInstallerCache()]);
	log.warn({ id, adminId }, 'Signed desktop update withdrawn from discovery');
}
