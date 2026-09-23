import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for the site-pack CDN upload path — the regression that broke
// human-readable names: the name is a display value and must NOT be validated
// as a version string, while the id (which becomes the CDN object name) and
// the zip file still are.

vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

const { dbInsert, dbQuery } = vi.hoisted(() => ({
	dbInsert: vi.fn(),
	dbQuery: vi.fn()
}));

// pino-pretty spawns a transport worker with piped stdio in dev; stubbing the
// logger keeps the test process from hanging on open handles at teardown.
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		child: () => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			fatal: vi.fn()
		})
	})
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: { resistanceModeScripts: { findFirst: dbQuery } },
		insert: dbInsert,
		update: vi.fn(),
		delete: vi.fn(),
		select: vi.fn()
	}
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('$lib/server/cache', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cache')>();
	return {
		...actual,
		invalidateSitePacksCache: vi.fn().mockResolvedValue(new Map())
	};
});

import { uploadSitePack } from './upload';
import { CDNErrorType, MAX_SITE_PACK_SIZE } from './common';

const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);

function zipFile(name = 'adult-content-pack.zip'): File {
	return new File([ZIP_BYTES], name, { type: 'application/zip' });
}

describe('uploadSitePack', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
		// db.insert(sitePack).values(...).onConflictDoUpdate(...) chain
		dbInsert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoUpdate: vi.fn().mockResolvedValue(undefined)
			})
		});
	});

	it('accepts a spaced human-readable name (regression: name is not a version)', async () => {
		const result = await uploadSitePack(zipFile(), 'Adult Content Pack', 'pack-1', false);
		expect(result.isOk()).toBe(true);

		const putCall = fetchMock.mock.calls[0];
		const putUrl = putCall[0] as URL;
		expect(putUrl.toString()).toContain('/site-packs/pack-1.zip');

		const valuesFn = dbInsert.mock.results[0].value.values as ReturnType<typeof vi.fn>;
		const insertValues = valuesFn.mock.calls[0][0];
		expect(insertValues.name).toBe('Adult Content Pack');
		expect(insertValues.id).toBe('pack-1');
		expect(insertValues.fileName).toBe('pack-1.zip');
		expect(insertValues.sha256).toMatch(/^[0-9a-f]{64}$/);
		expect(insertValues.size).toBe(ZIP_BYTES.length);
		expect(insertValues.requiresProSubscription).toBe(false);
	});

	it('accepts punctuation and non-ASCII display names', async () => {
		const result = await uploadSitePack(
			zipFile(),
			"Pack 'n' Roll — Social & Casino (Beta)",
			'pack-2',
			true
		);
		expect(result.isOk()).toBe(true);
		expect(fetchMock).toHaveBeenCalledOnce();
	});

	it('rejects an unsafe id (CDN object name) before any network call', async () => {
		for (const bad of ['../../evil', 'a/b', 'a\\b', '..', 'sp ace', '', 'x'.repeat(65)]) {
			const result = await uploadSitePack(zipFile(), 'Adult Content Pack', bad, false);
			if (result.isErr()) {
				expect(result.error).toBe(CDNErrorType.InvalidArtifact);
			} else {
				expect.unreachable(`id '${bad}' must be rejected`);
			}
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects an invalid name (empty or control characters)', async () => {
		for (const bad of ['', 'bad\u0000name', 'bad\u001Fname']) {
			const result = await uploadSitePack(zipFile(), bad, 'pack-3', false);
			if (result.isErr()) {
				expect(result.error).toBe(CDNErrorType.InvalidArtifact);
			} else {
				expect.unreachable(`name '${bad}' must be rejected`);
			}
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects a non-zip file', async () => {
		const textFile = new File(['not a zip'], 'x.txt', { type: 'text/plain' });
		const result = await uploadSitePack(textFile, 'Adult Content Pack', 'pack-1', false);
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects an empty file', async () => {
		const empty = new File([], 'empty.zip', { type: 'application/zip' });
		const result = await uploadSitePack(empty, 'Adult Content Pack', 'pack-1', false);
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects a site pack larger than 2 GiB', async () => {
		const big = { size: MAX_SITE_PACK_SIZE + 1 } as File;
		const result = await uploadSitePack(big, 'Adult Content Pack', 'pack-1', false);
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('cleans up the CDN object when the DB write fails', async () => {
		dbInsert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoUpdate: vi.fn().mockRejectedValue(new Error('connection lost'))
			})
		});

		const result = await uploadSitePack(zipFile(), 'Adult Content Pack', 'pack-1', false);
		expect(result.isErr()).toBe(true);

		const calls = fetchMock.mock.calls.map((call) => call[1] as RequestInit);
		const methods = calls.map((call) => (call as { method?: string }).method ?? 'GET');
		expect(methods).toContain('PUT');
		expect(methods).toContain('DELETE');
	});
});
