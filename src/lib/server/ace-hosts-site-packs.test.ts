import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'crypto';

vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn()
	})
}));

vi.mock('drizzle-orm', async (importOriginal) => {
	const actual = await importOriginal<typeof import('drizzle-orm')>();
	return {
		...actual,
		eq: (_column: unknown, value: string) => ({ id: value })
	};
});

const { storedHashes, uploadSitePack, deleteSitePack } = vi.hoisted(() => ({
	storedHashes: new Map<string, string>(),
	uploadSitePack: vi.fn(),
	deleteSitePack: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: () => ({
			from: () => ({
				where: (condition: { id: string }) => ({
					limit: async () =>
						storedHashes.has(condition.id)
							? [{ sha256: storedHashes.get(condition.id) }]
							: []
				})
			})
		})
	}
}));

vi.mock('$lib/server/cdn/upload', () => ({ uploadSitePack }));
vi.mock('$lib/server/cdn/delete', () => ({ deleteSitePack }));

import {
	ACE_HOSTS_SITE_PACKS,
	millisecondsUntilNextAceHostsSync,
	getAceHostsSitePackSyncStatus,
	parseSha256Checksums,
	syncAceHostsSitePacks
} from './ace-hosts-site-packs';

function sha256(bytes: Uint8Array): string {
	return crypto.createHash('sha256').update(bytes).digest('hex');
}

function releaseResponse(changed?: { assetName: string; bytes: Uint8Array }) {
	const fallbackHash = 'a'.repeat(64);
	const assets = ACE_HOSTS_SITE_PACKS.map((definition) => {
		const bytes = changed?.assetName === definition.assetName ? changed.bytes : undefined;
		const digest = bytes ? sha256(bytes) : fallbackHash;
		return {
			name: definition.assetName,
			size: bytes?.byteLength ?? 12,
			browser_download_url: `https://example.test/${definition.assetName}`,
			digest: `sha256:${digest}`
		};
	});
	return {
		tag_name: 'v2026.09.01',
		published_at: '2026-09-01T03:00:00Z',
		created_at: '2026-09-01T03:00:00Z',
		assets
	};
}

describe('ace-hosts site-pack sync', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		storedHashes.clear();
		deleteSitePack.mockResolvedValue({ isErr: () => false });
	});

	it('includes all 16 canonical ace-hosts release site packs', () => {
		expect(ACE_HOSTS_SITE_PACKS).toHaveLength(16);
		expect(new Set(ACE_HOSTS_SITE_PACKS.map((pack) => pack.id)).size).toBe(16);
		expect(ACE_HOSTS_SITE_PACKS.map((pack) => pack.assetName)).toContain(
			'site-pack-dating-pro.zip'
		);
		expect(ACE_HOSTS_SITE_PACKS.map((pack) => pack.assetName)).toContain(
			'site-pack-anime-manga-pro.zip'
		);
		expect(ACE_HOSTS_SITE_PACKS.some((pack) => pack.id === 'pack-anime-manga-extended')).toBe(false);
		for (const id of ['pack-gambling-free', 'pack-streaming-free']) {
			const pack = ACE_HOSTS_SITE_PACKS.find((item) => item.id === id);
			expect(pack?.requiresProSubscription).toBe(false);
		}

	});

	it('shares an in-flight sync between startup, monthly and manual triggers', async () => {
		for (const definition of ACE_HOSTS_SITE_PACKS) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		let finishFetch!: (response: Response) => void;
		const responsePending = new Promise<Response>((resolve) => {
			finishFetch = resolve;
		});
		const fetchMock = vi.fn().mockReturnValue(responsePending);
		vi.stubGlobal('fetch', fetchMock);

		const first = syncAceHostsSitePacks();
		const second = syncAceHostsSitePacks();
		expect(first).toBe(second);
		expect(getAceHostsSitePackSyncStatus().running).toBe(true);

		finishFetch(new Response(JSON.stringify(releaseResponse()), { status: 200 }));
		await Promise.all([first, second]);
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(getAceHostsSitePackSyncStatus()).toMatchObject({
			running: false,
			lastError: null,
			lastResult: { release: 'v2026.09.01', updated: 0, unchanged: 16 }
		});
	});

	it('records fetch errors and releases the lock for a retry', async () => {
		const fetchMock = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }));
		vi.stubGlobal('fetch', fetchMock);

		await expect(syncAceHostsSitePacks()).rejects.toThrow('status 503');
		expect(getAceHostsSitePackSyncStatus()).toMatchObject({
			running: false,
			lastError: expect.stringContaining('503')
		});

		for (const definition of ACE_HOSTS_SITE_PACKS) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify(releaseResponse()), { status: 200 })
		);
		await expect(syncAceHostsSitePacks()).resolves.toMatchObject({ updated: 0, unchanged: 16 });
		expect(getAceHostsSitePackSyncStatus().lastError).toBeNull();
	});

	it('retires the old anime pack after a consolidated release is synced', async () => {
		for (const definition of ACE_HOSTS_SITE_PACKS) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		storedHashes.set('pack-anime-manga-extended', 'a'.repeat(64));
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
			new Response(JSON.stringify(releaseResponse()), { status: 200 })
		));
		await expect(syncAceHostsSitePacks()).resolves.toMatchObject({ unchanged: 16 });
		expect(deleteSitePack).toHaveBeenCalledExactlyOnceWith('pack-anime-manga-extended');
	});

	it('does not retire anime Extended while the upstream release still contains it', async () => {
		for (const definition of ACE_HOSTS_SITE_PACKS) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		storedHashes.set('pack-anime-manga-extended', 'a'.repeat(64));
		const oldRelease = releaseResponse();
		oldRelease.assets.push({
			name: 'site-pack-anime-manga-extended.zip',
			size: 12,
			browser_download_url: 'https://example.test/site-pack-anime-manga-extended.zip',
			digest: 'sha256:' + 'a'.repeat(64)
		});
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
			new Response(JSON.stringify(oldRelease), { status: 200 })
		));
		await syncAceHostsSitePacks();
		expect(deleteSitePack).not.toHaveBeenCalled();
	});

	it('parses sha256sum manifests', () => {
		const first = 'a'.repeat(64);
		const second = 'b'.repeat(64);
		expect(
			parseSha256Checksums(`${first}  site-pack-adult-free.zip\n${second} *gaming.zip\n`)
		).toEqual(
			new Map([
				['site-pack-adult-free.zip', first],
				['gaming.zip', second]
			])
		);
	});

	it('schedules the monthly sync for the second day at 04:00 UTC', () => {
		const now = new Date('2026-09-20T12:00:00Z');
		const expected = new Date('2026-10-02T04:00:00Z').getTime() - now.getTime();
		expect(millisecondsUntilNextAceHostsSync(now)).toBe(expected);
	});

	it('skips downloads and uploads when every release hash is already stored', async () => {
		const release = releaseResponse();
		for (const definition of ACE_HOSTS_SITE_PACKS) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify(release), {
				status: 200,
				headers: { 'content-type': 'application/json' }
			})
		);
		vi.stubGlobal('fetch', fetchMock);

		await syncAceHostsSitePacks();

		expect(fetchMock).toHaveBeenCalledOnce();
		expect(uploadSitePack).not.toHaveBeenCalled();
	});

	it('downloads, verifies and mirrors a changed SQLite pack', async () => {
		const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
		const changed = ACE_HOSTS_SITE_PACKS[0];
		const release = releaseResponse({ assetName: changed.assetName, bytes });
		for (const definition of ACE_HOSTS_SITE_PACKS.slice(1)) {
			storedHashes.set(definition.id, 'a'.repeat(64));
		}
		const expectedHash = sha256(bytes);
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce(
				new Response(JSON.stringify(release), {
					status: 200,
					headers: { 'content-type': 'application/json' }
				})
			)
			.mockResolvedValueOnce(new Response(bytes, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		uploadSitePack.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: 'https://cdn.test/pack.zip', hash: expectedHash })
		});

		await syncAceHostsSitePacks();

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(uploadSitePack).toHaveBeenCalledOnce();
		const [file, name, id, requiresPro, canDownload, updatedAt] = uploadSitePack.mock.calls[0];
		expect(file).toBeInstanceOf(File);
		expect(file.name).toBe(changed.assetName);
		expect(name).toBe(changed.name);
		expect(id).toBe(changed.id);
		expect(requiresPro).toBe(false);
		expect(canDownload).toBe(true);
		expect(updatedAt).toEqual(new Date('2026-09-01T03:00:00Z'));
	});
});
