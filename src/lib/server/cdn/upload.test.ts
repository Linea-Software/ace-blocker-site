import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for the CDN upload path: validation, SHA-256 handling, and
// cleanup of the CDN object when the DB write fails (no inconsistent
// database/CDN state).

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
		invalidateResistanceCache: vi.fn().mockResolvedValue(null)
	};
});

import { uploadResistanceModeScript } from './upload';
import { CDNErrorType } from './common';

const ZIP_BYTES = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);

function zipFile(name = 'resistance-scripts.zip'): File {
	return new File([ZIP_BYTES], name, { type: 'application/zip' });
}

describe('uploadResistanceModeScript', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
		// db.insert(...).values(...) chain
		dbInsert.mockReturnValue({
			values: vi.fn().mockResolvedValue(undefined)
		});
	});

	it('rejects an unsafe version before any network call', async () => {
		const result = await uploadResistanceModeScript(zipFile(), '../../evil');
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects a non-zip file', async () => {
		const textFile = new File(['not a zip'], 'x.txt', { type: 'text/plain' });
		const result = await uploadResistanceModeScript(textFile, '1.0.0');
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects an oversized file', async () => {
		const big = new File([new Uint8Array(101 * 1024 * 1024)], 'big.zip', {
			type: 'application/zip'
		});
		const result = await uploadResistanceModeScript(big, '1.0.0');
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.InvalidArtifact);
		} else {
			expect.unreachable('upload must be rejected');
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('uploads with a SHA-256 checksum and records matching metadata', async () => {
		const result = await uploadResistanceModeScript(zipFile(), '2026-09-01');
		expect(result.isOk()).toBe(true);

		const putCall = fetchMock.mock.calls[0];
		const putUrl = putCall[0] as URL;
		const putInit = putCall[1] as RequestInit;
		expect(putUrl.toString()).toContain(
			'/resistance-mode-scripts/2026-09-01/resistance-mode-scripts.zip'
		);
		const headers = new Headers(putInit.headers);
		expect(headers.get('Checksum')).toMatch(/^[0-9a-f]{64}$/);

		// The DB row stores the same lowercase hex SHA-256 (data is passed to
		// db.insert(table).values(data)).
		const valuesFn = dbInsert.mock.results[0].value.values as ReturnType<typeof vi.fn>;
		const insertValues = valuesFn.mock.calls[0][0];
		expect(insertValues.version).toBe('2026-09-01');
		expect(insertValues.sha256).toBe(headers.get('Checksum'));
		expect(insertValues.size).toBe(ZIP_BYTES.length);
		expect(insertValues.canBeDownloaded).toBe(true);
	});

	it('cleans up the CDN object when the DB insert fails', async () => {
		dbInsert.mockReturnValue({
			values: vi.fn().mockRejectedValue(new Error('connection lost'))
		});

		const result = await uploadResistanceModeScript(zipFile(), '1.0.0');
		expect(result.isErr()).toBe(true);

		// PUT (upload) then DELETE (cleanup) must both have been attempted.
		const calls = fetchMock.mock.calls.map((call) => call[1] as RequestInit);
		const methods = calls.map((call) => (call as { method?: string }).method ?? 'GET');
		expect(methods).toContain('PUT');
		expect(methods).toContain('DELETE');
	});

	it('does not leave a DB row when the CDN upload itself fails', async () => {
		fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));

		const result = await uploadResistanceModeScript(zipFile(), '1.0.0');
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.UploadFailed);
		} else {
			expect.unreachable('upload must fail');
		}
		expect(dbInsert).not.toHaveBeenCalled();
	});
});
