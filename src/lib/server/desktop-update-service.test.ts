import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createPrivateKey, createPublicKey, sign } from 'node:crypto';

const state = vi.hoisted(() => ({
	rows: [] as Record<string, unknown>[],
	linuxCandidate: null as Record<string, unknown> | null,
	verifyLegacyInstallerObject: vi.fn(),
	audits: [] as Record<string, unknown>[],
	failPublishCommit: false,
	removePublishedDesktopObject: vi.fn(),
	verifyStoredObject: vi.fn(),
	promoteDesktopObject: vi.fn(),
	invalidateDesktopReleaseCache: vi.fn(),
	invalidateInstallerCache: vi.fn()
}));

vi.mock('$lib/server/db', () => {
	const mockTx = {
		insert: () => ({
			values: async (value: Record<string, unknown>) => {
				if (value.action) {
					state.audits.push(value);
					return;
				}
				if (
					state.rows.some(
						(row) =>
							row.version === value.version &&
							row.os === value.os &&
							row.architecture === value.architecture &&
							row.updateState !== 'legacy'
					)
				)
					throw new Error('unique constraint');
				state.rows.push(value);
				if (state.linuxCandidate) state.linuxCandidate.version = value.version;
			}
		}),
		update: () => ({
			set: (values: Record<string, unknown>) => ({
				where: () => ({
					returning: async () => {
						if (state.failPublishCommit && values.updateState === 'published')
							throw new Error('DB commit failed');
						if ('canBeDownloaded' in values && !('updateState' in values)) {
							if (!state.linuxCandidate) return [];
							Object.assign(state.linuxCandidate, values);
							return [{ ...state.linuxCandidate }];
						}
						const requiredState =
							values.updateState === 'publishing'
								? 'staged'
								: values.updateState === 'published'
									? 'publishing'
									: values.updateState === 'withdrawn'
										? 'published'
										: 'publishing';
						const row = state.rows.find((row) => row.updateState === requiredState);
						if (!row) return [];
						Object.assign(row, values);
						return [{ ...row }];
					}
				})
			})
		}),
		select: (selected?: unknown) => ({
			from: () => ({
				where: async () =>
					selected === undefined
						? state.linuxCandidate
							? [state.linuxCandidate]
							: []
						: state.rows
								.filter((row) =>
									['published', 'withdrawn'].includes(String(row.updateState))
								)
								.map((row) => ({ version: row.version }))
			})
		})
	};
	return {
		db: {
			...mockTx,
			transaction: async (callback: (tx: typeof mockTx) => Promise<unknown>) =>
				callback(mockTx),
			query: {
				aceBlockerInstaller: {
					findFirst: async () => state.rows[0] ?? null
				}
			}
		}
	};
});
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));
vi.mock('$lib/server/cdn/common', () => ({
	installersBasePath: new URL('https://cdn.test/ace-blocker-installer/')
}));
vi.mock('$lib/server/cache', () => ({
	invalidateDesktopReleaseCache: state.invalidateDesktopReleaseCache,
	invalidateInstallerCache: state.invalidateInstallerCache
}));
vi.mock('./installer-release-publication', () => ({
	verifyLegacyInstallerObject: state.verifyLegacyInstallerObject
}));
vi.mock('./desktop-update-storage', () => ({
	desktopStageKey: (version: string, sha: string) => `desktop-updates/${version}/${sha}.msi`,
	publishedUrl: (version: string, sha: string) =>
		`https://cdn.test/ace-blocker-installer/signed/windows/x64/${version}/${sha}.msi`,
	verifyStoredObject: state.verifyStoredObject,
	promoteDesktopObject: state.promoteDesktopObject,
	removePublishedDesktopObject: state.removePublishedDesktopObject
}));

import {
	stageDesktopRelease,
	publishDesktopRelease,
	withdrawDesktopRelease
} from './desktop-update-service';
import { SIGNED_CONTEXT } from './desktop-update-security';

const seed = Buffer.from('9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60', 'hex');
const key = createPrivateKey({
	key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]),
	format: 'der',
	type: 'pkcs8'
});
const pub = createPublicKey(key)
	.export({ type: 'spki', format: 'der' })
	.subarray(-32)
	.toString('hex');
const sha = 'a'.repeat(64);
function input(version = '1.10.0') {
	const payload = {
		schemaVersion: 1,
		version,
		channel: 'stable',
		os: 'windows',
		architecture: 'x64',
		sha256: sha,
		packageUrl: `https://cdn.test/ace-blocker-installer/signed/windows/x64/${version}/${sha}.msi`,
		publisherCertificateSha256: 'b'.repeat(64),
		minimumInstalledVersion: null
	};
	const raw = Buffer.from(
		JSON.stringify(
			Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)))
		)
	);
	return {
		envelope: {
			payload: raw.toString('base64'),
			signature: sign(null, Buffer.concat([SIGNED_CONTEXT, raw]), key).toString('base64'),
			key_id: 'ace-stable-v1'
		},
		stagingKey: `desktop-updates/${version}/${sha}.msi`,
		size: 64
	};
}

const previous = {
	ACE_DESKTOP_UPDATES_ENABLED: process.env.ACE_DESKTOP_UPDATES_ENABLED,
	ACE_DESKTOP_UPDATE_PUBLIC_KEYS: process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS,
	ACE_DESKTOP_PUBLISHER_CERT_SHA256: process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256
};

describe('signed desktop release ingest/publication lifecycle', () => {
	beforeEach(() => {
		state.rows.length = 0;
		state.linuxCandidate = {
			id: 'linux-1',
			version: '1.10.0',
			os: 'linux',
			architecture: 'x64',
			updateState: 'legacy',
			artifactValidatedAt: new Date(),
			canBeDownloaded: false,
			sha256: 'c'.repeat(64)
		};
		state.audits.length = 0;
		state.failPublishCommit = false;
		vi.clearAllMocks();
		state.verifyStoredObject.mockResolvedValue(undefined);
		state.verifyLegacyInstallerObject.mockResolvedValue(undefined);
		state.promoteDesktopObject.mockResolvedValue(undefined);
		state.removePublishedDesktopObject.mockResolvedValue(undefined);
		state.invalidateDesktopReleaseCache.mockResolvedValue(undefined);
		state.invalidateInstallerCache.mockResolvedValue(undefined);
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'true';
		process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS = JSON.stringify({ 'ace-stable-v1': pub });
		process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256 = 'b'.repeat(64);
	});
	afterEach(() => {
		for (const [name, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	it('verifies staging bytes before persisting a signed but unpublished release', async () => {
		const id = await stageDesktopRelease(input());
		expect(state.rows[0]).toMatchObject({
			id,
			updateState: 'staged',
			canBeDownloaded: false,
			version: '1.10.0',
			size: 64,
			sha256: sha
		});
		expect(state.verifyStoredObject).toHaveBeenCalledWith('staging', '1.10.0', sha, 64);
		expect(state.audits).toMatchObject([{ action: 'stage', result: 'success' }]);
		expect(state.promoteDesktopObject).not.toHaveBeenCalled();
	});
	it('rejects size, staged hash errors, missing keys and duplicate versions', async () => {
		await expect(stageDesktopRelease({ ...input(), size: -1 })).rejects.toThrow();
		state.verifyStoredObject.mockRejectedValueOnce(new Error('hash mismatch'));
		await expect(stageDesktopRelease(input())).rejects.toThrow(/hash mismatch/);
		await stageDesktopRelease(input());
		await expect(stageDesktopRelease(input())).rejects.toThrow(/already reserved/);
		delete process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS;
		await expect(stageDesktopRelease(input('1.11.0'))).rejects.toThrow(/not configured/);
	});
	it('fails closed on simultaneous ingest of the same version', async () => {
		const outcomes = await Promise.allSettled([
			stageDesktopRelease(input()),
			stageDesktopRelease(input())
		]);
		expect(outcomes.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(state.rows).toHaveLength(1);
	});
	it('publishes only after verification and an atomic state claim, with audit and cache refresh', async () => {
		const id = await stageDesktopRelease(input());
		await publishDesktopRelease(id, 'admin-123');
		expect(state.rows[0]).toMatchObject({ updateState: 'published', canBeDownloaded: true });
		expect(state.rows[0].publishedAt).toBeInstanceOf(Date);
		expect(state.promoteDesktopObject).toHaveBeenCalledWith('1.10.0', sha, 64);
		expect(state.audits).toContainEqual(
			expect.objectContaining({
				actor: 'admin-123',
				action: 'publish',
				result: 'success'
			})
		);
		expect(state.invalidateDesktopReleaseCache).toHaveBeenCalledTimes(1);
	});
	it('rejects unsigned or unverifiable publication even if legacy download flag was set', async () => {
		const id = await stageDesktopRelease(input());
		state.rows[0].signedEnvelope = null;
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(
			/Missing signed envelope/
		);
		expect(state.promoteDesktopObject).not.toHaveBeenCalled();
		expect(state.rows[0].updateState).toBe('staged');
		expect(state.audits).toContainEqual(
			expect.objectContaining({ action: 'publish', result: 'failure' })
		);
	});
	it('refuses to publish without a validated Linux companion', async () => {
		const id = await stageDesktopRelease(input());
		state.linuxCandidate = null;
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(/Linux x64 tar.gz/);
		expect(state.rows[0].updateState).toBe('staged');
		expect(state.promoteDesktopObject).not.toHaveBeenCalled();
	});
	it('rejects a Linux companion that changes in storage before publication', async () => {
		const id = await stageDesktopRelease(input());
		state.verifyLegacyInstallerObject.mockRejectedValueOnce(new Error('stored hash mismatch'));
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(
			/stored hash mismatch/
		);
		expect(state.rows[0].updateState).toBe('staged');
	});
	it('rejects CDN outage and preserves staged state', async () => {
		const id = await stageDesktopRelease(input());
		state.promoteDesktopObject.mockRejectedValueOnce(new Error('CDN unreachable'));
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(/CDN unreachable/);
		expect(state.rows[0].updateState).toBe('staged');
	});
	it('removes a promoted object if the database publication transaction fails', async () => {
		const id = await stageDesktopRelease(input());
		state.failPublishCommit = true;
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(/DB commit failed/);
		expect(state.removePublishedDesktopObject).toHaveBeenCalledWith('1.10.0', sha);
		expect(state.rows[0].updateState).toBe('staged');
	});
	it('keeps an already committed release published after cache refresh outage', async () => {
		const id = await stageDesktopRelease(input());
		state.invalidateInstallerCache.mockRejectedValueOnce(new Error('DB not reachable'));
		await publishDesktopRelease(id, 'admin-123');
		expect(state.rows[0].updateState).toBe('published');
		expect(state.removePublishedDesktopObject).not.toHaveBeenCalled();
	});
	it('withdraws permanently; no republishing or older version after a withdrawal', async () => {
		const id = await stageDesktopRelease(input());
		await publishDesktopRelease(id, 'admin-123');
		await withdrawDesktopRelease(id, 'admin-123');
		expect(state.rows[0]).toMatchObject({ updateState: 'withdrawn', canBeDownloaded: false });
		expect(state.audits).toContainEqual(
			expect.objectContaining({ action: 'withdraw', result: 'success' })
		);
		await expect(publishDesktopRelease(id, 'admin-123')).rejects.toThrow(/Only staged/);
		const older = input('1.9.0');
		// The existing row represents another version, so the normal duplicate check
		// enforces a stricter version/target reservation and never lets this through.
		state.rows.length = 0;
		const oldId = await stageDesktopRelease(older);
		state.rows.push({
			version: '1.10.0',
			os: 'windows',
			architecture: 'x64',
			updateChannel: 'stable',
			updateState: 'withdrawn'
		});
		await expect(publishDesktopRelease(oldId, 'admin-123')).rejects.toThrow(/newer or equal/);
	});
	it('prevents simultaneous publish on the same row', async () => {
		const id = await stageDesktopRelease(input());
		const results = await Promise.allSettled([
			publishDesktopRelease(id, 'admin-123'),
			publishDesktopRelease(id, 'admin-123')
		]);
		expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
		expect(state.promoteDesktopObject).toHaveBeenCalledTimes(1);
	});
});
