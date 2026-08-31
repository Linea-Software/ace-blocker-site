import { describe, it, expect, vi, beforeEach } from 'vitest';

// Router-level tests for the admin resistance endpoints: auth gating and
// upload validation (size/type/version) — no live DB or CDN needed.

const validZip = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])], 'resistance-scripts.zip', {
	type: 'application/zip'
});

vi.mock('$lib/server/auth', () => ({
	dodoPayments: { licenses: { validate: vi.fn() }, subscriptions: { list: vi.fn(), update: vi.fn() } },
	auth: {
		handler: () => new Response('Not found', { status: 404 }),
		api: {
			getSession: vi.fn().mockResolvedValue(null),
			listSessions: vi.fn().mockResolvedValue([]),
			createApiKey: vi.fn().mockResolvedValue({ key: 'test-key' }),
			listApiKeys: vi.fn().mockResolvedValue({ apiKeys: [] }),
			deleteApiKey: vi.fn(),
			revokeSession: vi.fn()
		}
	}
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			resistanceModeScripts: { findFirst: vi.fn() },
			user: { findFirst: vi.fn() },
			session: { findFirst: vi.fn() },
			backups: { findFirst: vi.fn() }
		},
		select: vi.fn(),
		insert: vi.fn(),
		update: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

const { uploadResistanceModeScript } = vi.hoisted(() => ({
	uploadResistanceModeScript: vi.fn()
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

vi.mock('$lib/server/cdn', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cdn')>();
	return {
		...actual,
		uploadResistanceModeScript,
		deleteResistanceModeScript: vi.fn()
	};
});

// cache.ts touches the db at import; keep its real behavior (it only reads
// via db mocks above) but stub the invalidation helpers.
vi.mock('$lib/server/cache', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cache')>();
	return {
		...actual,
		invalidateResistanceCache: vi.fn().mockResolvedValue(null)
	};
});

import { adminRouter } from './index';

function handle(path: string, init?: RequestInit) {
	// The adminRouter carries the /admin prefix itself.
	return adminRouter.handle(new Request(`http://localhost${path}`, init));
}

describe('admin resistance endpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects non-admin sessions with 403', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue(null);

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(validZip, '1.0.0')
		});
		expect(res.status).toBe(403);
	});

	it('rejects a non-admin role with 403', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'user' } as never
		});

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(validZip, '1.0.0')
		});
		expect(res.status).toBe(403);
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	async function asAdmin() {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'admin' } as never
		});
	}

	function uploadBody(file: File, version: string): FormData {
		const form = new FormData();
		form.append('file', file);
		form.append('version', version);
		return form;
	}

	it('rejects an unsafe version before any upload', async () => {
		await asAdmin();
		uploadResistanceModeScript.mockResolvedValue({ isErr: () => false, _unsafeUnwrap: () => ({}) });

		for (const bad of ['../../evil', 'a/b', 'a\\b', '..', 'sp ace', '', 'x'.repeat(65)]) {
			const res = await handle('/admin/resistance/upload', {
				method: 'POST',
				body: uploadBody(validZip, bad)
			});
			expect(res.status, `version '${bad}' must be rejected`).toBe(400);
		}
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('rejects a non-zip file', async () => {
		await asAdmin();
		const textFile = new File(['hello world'], 'notes.txt', { type: 'text/plain' });

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(textFile, '1.0.0')
		});
		expect(res.status).toBe(400);
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('rejects an empty file', async () => {
		await asAdmin();
		const empty = new File([], 'empty.zip', { type: 'application/zip' });

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(empty, '1.0.0')
		});
		expect(res.status).toBe(400);
	});

	it('rejects an oversized upload', async () => {
		await asAdmin();
		const big = new File([new Uint8Array(101 * 1024 * 1024)], 'big.zip', { type: 'application/zip' });

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(big, '1.0.0')
		});
		expect(res.status).toBe(400);
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('accepts a valid zip + version and creates metadata', async () => {
		await asAdmin();
		uploadResistanceModeScript.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: 'https://cdn/x.zip', hash: 'abc' })
		} as never);

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(validZip, '2026-09-01')
		});
		expect(res.status).toBe(200);
		expect(uploadResistanceModeScript).toHaveBeenCalledOnce();
		// Uploads are staged: canBeDownloaded=false until an admin marks the
		// release downloadable (spec: artifacts gated by canBeDownloaded).
		expect(uploadResistanceModeScript).toHaveBeenCalledWith(
			expect.any(File),
			'2026-09-01',
			false
		);
	});

	it('maps an upload failure to 500 without leaking internals', async () => {
		await asAdmin();
		uploadResistanceModeScript.mockResolvedValue({
			isErr: () => true,
			error: 4 // CDNErrorType.UploadFailed
		} as never);

		const res = await handle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(validZip, '1.0.0')
		});
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.message).not.toContain('Bunny');
		expect(body.message).not.toContain('token');
	});

	it('set-downloadable withdraws and restores a release', async () => {
		await asAdmin();
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.resistanceModeScripts.findFirst).mockResolvedValue({
			id: 'release-1'
		} as never);
		vi.mocked(db.update).mockReturnValue({
			set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
		} as never);

		const res = await handle('/admin/resistance/set-downloadable', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'release-1', canBeDownloaded: false })
		});
		expect(res.status).toBe(200);
		expect(db.update).toHaveBeenCalled();
	});

	it('set-downloadable 404s for an unknown release', async () => {
		await asAdmin();
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.resistanceModeScripts.findFirst).mockResolvedValue(null as never);

		const res = await handle('/admin/resistance/set-downloadable', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'nope', canBeDownloaded: false })
		});
		expect(res.status).toBe(404);
	});
});
