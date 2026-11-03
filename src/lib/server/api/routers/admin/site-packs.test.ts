import { describe, it, expect, vi, beforeEach } from 'vitest';

// Router-level tests for the admin site-pack endpoints: auth gating, the
// upload regression (spaced human-readable names must pass through; rejected
// artifacts map to 400, never the blanket 500) — no live DB or CDN needed.

const validZip = new File(
	[new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
	'adult-content-pack.zip',
	{ type: 'application/zip' }
);

vi.mock('$lib/server/auth', () => ({
	dodoPayments: {
		licenses: { validate: vi.fn() },
		subscriptions: { list: vi.fn(), update: vi.fn() }
	},
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

const { getAceHostsSitePackSyncStatus, syncAceHostsSitePacks } = vi.hoisted(() => ({
	getAceHostsSitePackSyncStatus: vi.fn(),
	syncAceHostsSitePacks: vi.fn()
}));

vi.mock('$lib/server/ace-hosts-site-packs', () => ({
	getAceHostsSitePackSyncStatus,
	syncAceHostsSitePacks
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			sitePack: { findFirst: vi.fn() },
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

const { uploadSitePack } = vi.hoisted(() => ({
	uploadSitePack: vi.fn()
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
		uploadSitePack,
		deleteSitePack: vi.fn()
	};
});

// cache.ts touches the db at import; keep its real behavior (it only reads
// via db mocks above) but stub the invalidation helpers.
vi.mock('$lib/server/cache', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cache')>();
	return {
		...actual,
		invalidateSitePacksCache: vi.fn().mockResolvedValue(new Map())
	};
});

import { adminRouter } from './index';

function handle(path: string, init?: RequestInit) {
	// The adminRouter carries the /admin prefix itself.
	return adminRouter.handle(new Request(`http://localhost${path}`, init));
}

describe('admin site-pack endpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getAceHostsSitePackSyncStatus.mockReturnValue({
			running: false,
			lastStartedAt: null,
			lastCompletedAt: null,
			lastError: null,
			lastResult: null
		});
		syncAceHostsSitePacks.mockResolvedValue({
			release: 'v2026.11.01',
			updated: 1,
			unchanged: 14
		});
	});

	it('requires admin access for both the status and manual sync', async () => {
		const statusResponse = await handle('/admin/site-packs/sync-status');
		const syncResponse = await handle('/admin/site-packs/sync', { method: 'POST' });
		expect(statusResponse.status).toBe(403);
		expect(syncResponse.status).toBe(403);
		expect(syncAceHostsSitePacks).not.toHaveBeenCalled();
	});

	it('allows admins to check the sync status and initiate an asynchronous pull', async () => {
		await asAdmin();
		const statusResponse = await handle('/admin/site-packs/sync-status');
		expect(statusResponse.status).toBe(200);
		expect(await statusResponse.json()).toMatchObject({ running: false, lastResult: null });

		const syncResponse = await handle('/admin/site-packs/sync', { method: 'POST' });
		expect(syncResponse.status).toBe(202);
		expect(await syncResponse.json()).toEqual({ started: true });
		expect(syncAceHostsSitePacks).toHaveBeenCalledOnce();
	});

	it('rejects a second manual sync while the current run is active', async () => {
		await asAdmin();
		getAceHostsSitePackSyncStatus.mockReturnValue({
			running: true,
			lastStartedAt: '2026-11-01T04:00:00Z',
			lastCompletedAt: null,
			lastError: null,
			lastResult: null
		});
		const response = await handle('/admin/site-packs/sync', { method: 'POST' });
		expect(response.status).toBe(409);
		expect(syncAceHostsSitePacks).not.toHaveBeenCalled();
	});

	it('rejects non-admin sessions with 403', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue(null);

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: uploadBody(validZip, 'Adult Content Pack', 'pack-1')
		});
		expect(res.status).toBe(403);
	});

	it('rejects a non-admin role with 403', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'user' } as never
		});

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: uploadBody(validZip, 'Adult Content Pack', 'pack-1')
		});
		expect(res.status).toBe(403);
		expect(uploadSitePack).not.toHaveBeenCalled();
	});

	async function asAdmin() {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'admin' } as never
		});
	}

	function uploadBody(file: File, name: string, id: string): FormData {
		const form = new FormData();
		form.append('file', file);
		form.append('name', name);
		form.append('id', id);
		form.append('requiresProSubscription', 'false');
		return form;
	}

	it('accepts a spaced human-readable name and creates metadata', async () => {
		await asAdmin();
		uploadSitePack.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: 'https://cdn/x.zip', hash: 'abc' })
		} as never);

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: uploadBody(validZip, 'Adult Content Pack', 'pack-1')
		});
		expect(res.status).toBe(200);
		expect(uploadSitePack).toHaveBeenCalledOnce();
		// The name must reach the uploader untouched — the 500 regression was
		// caused by treating this display name as a version string.
		expect(uploadSitePack).toHaveBeenCalledWith(
			expect.any(File),
			'Adult Content Pack',
			'pack-1',
			false
		);
	});

	it('maps a rejected artifact (invalid zip or unsafe id) to 400, not 500', async () => {
		await asAdmin();
		uploadSitePack.mockResolvedValue({
			isErr: () => true,
			error: 6 // CDNErrorType.InvalidArtifact
		} as never);

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: uploadBody(validZip, 'Adult Content Pack', 'pack-1')
		});
		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.message).toContain('rejected');
		expect(body.message).not.toContain('Bunny');
	});

	it('maps a CDN upload failure to 500 without leaking internals', async () => {
		await asAdmin();
		uploadSitePack.mockResolvedValue({
			isErr: () => true,
			error: 3 // CDNErrorType.UploadFailed
		} as never);

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: uploadBody(validZip, 'Adult Content Pack', 'pack-1')
		});
		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.message).not.toContain('token');
	});

	it('rejects a missing file/name/id before any upload', async () => {
		await asAdmin();
		const form = new FormData();
		form.append('file', validZip);
		form.append('name', 'Adult Content Pack');

		const res = await handle('/admin/site-packs/upload', {
			method: 'POST',
			body: form
		});
		// Elysia validates the body schema (t.Object) before the handler runs.
		expect(res.status).toBe(422);
		expect(uploadSitePack).not.toHaveBeenCalled();
	});
});
