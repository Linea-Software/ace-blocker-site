import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
	rows: [] as Record<string, unknown>[],
	select: vi.fn()
}));
vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () =>
					Promise.resolve(
						mockState.rows.filter((row) =>
							['published', 'withdrawn'].includes(String(row.updateState))
						)
					)
			})
		})
	}
}));
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));
vi.mock('$lib/server/cdn/common', () => ({
	installersBasePath: new URL('https://cdn.test/ace-blocker-installer/')
}));
vi.mock('$lib/server/desktop-update-security', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/desktop-update-security')>();
	return {
		...actual,
		verifyDesktopEnvelope: (envelope: { payload: string }) =>
			JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8'))
	};
});

import { getLatestDesktopEnvelope, invalidateDesktopReleaseCache } from './cache';

function release(
	version: string,
	state: 'staged' | 'published' | 'withdrawn',
	os = 'windows',
	architecture = 'x64'
) {
	const sha = 'a'.repeat(64);
	const url = `https://cdn.test/ace-blocker-installer/signed/windows/x64/${version}/${sha}.msi`;
	const envelope = {
		payload: Buffer.from(
			JSON.stringify({
				version,
				sha256: sha,
				packageUrl: url
			})
		).toString('base64'),
		signature: 'signature',
		key_id: 'ace-stable-v1'
	};
	return {
		id: version,
		version,
		os,
		architecture,
		updateChannel: 'stable',
		updateState: state,
		canBeDownloaded: state === 'published',
		signedEnvelope: JSON.stringify(envelope),
		sha256: sha,
		downloadUrl: url,
		manifestKeyId: envelope.key_id
	};
}

const env = {
	ACE_DESKTOP_UPDATES_ENABLED: process.env.ACE_DESKTOP_UPDATES_ENABLED,
	ACE_DESKTOP_UPDATE_PUBLIC_KEYS: process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS,
	ACE_DESKTOP_PUBLISHER_CERT_SHA256: process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256
};

describe('in-memory desktop feed selection/invalidation', () => {
	beforeEach(() => {
		mockState.rows = [];
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'true';
		process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS = '{"ace-stable-v1":"placeholder"}';
		process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256 = 'b'.repeat(64);
	});
	afterEach(() => {
		for (const [name, value] of Object.entries(env)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});
	it('selects 1.10 over 1.9 regardless of creation order and rejects RC/wrong target', async () => {
		mockState.rows = [
			release('1.10.0', 'published'),
			release('1.9.0', 'published'),
			release('5.0.0', 'staged'),
			release('2.0.0', 'published', 'linux'),
			release('3.0.0', 'published', 'windows', 'arm64')
		];
		await invalidateDesktopReleaseCache();
		const envelope = getLatestDesktopEnvelope()!;
		const payload = JSON.parse(Buffer.from(envelope.payload, 'base64').toString('utf8'));
		expect(payload.version).toBe('1.10.0');
	});
	it('withdraws the top version with no automatic fallback to an older vulnerable release', async () => {
		mockState.rows = [release('1.9.0', 'published'), release('1.10.0', 'published')];
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).not.toBeNull();
		mockState.rows[1].updateState = 'withdrawn';
		mockState.rows[1].canBeDownloaded = false;
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).toBeNull();
		mockState.rows.push(release('1.11.0', 'published'));
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).not.toBeNull();
	});
	it('leaves unsigned/uncertified rows ineligible even if download flag is true', async () => {
		const newer = release('1.10.0', 'published');
		newer.signedEnvelope = null as unknown as string;
		mockState.rows = [release('1.9.0', 'published'), newer];
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).toBeNull();
	});
	it('fails closed when key configuration or feature flag is removed', async () => {
		mockState.rows = [release('1.10.0', 'published')];
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).not.toBeNull();
		delete process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS;
		expect(getLatestDesktopEnvelope()).toBeNull();
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'false';
		await invalidateDesktopReleaseCache();
		expect(getLatestDesktopEnvelope()).toBeNull();
	});
});
