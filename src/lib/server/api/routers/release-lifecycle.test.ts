import { describe, it, expect, vi, beforeEach } from 'vitest';

// Release lifecycle (spec: artifacts gated by canBeDownloaded; release plan
// Step 5.2). Tests written from the spec contract first:
//   1. uploads are STAGED — a fresh release is not downloadable until an admin
//      marks it (canBeDownloaded=false on upload);
//   2. set-downloadable=true makes the public route serve it;
//   3. revoking (false) or missing releases make the public route refuse.
// No live DB or CDN: auth, db, cdn uploaders and the cache are mocked at the
// module seam.

const validZip = new File(
	[new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0])],
	'resistance-scripts.zip',
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

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			resistanceModeScripts: { findFirst: vi.fn() },
			aceBlockerInstaller: { findFirst: vi.fn() },
			user: { findFirst: vi.fn() },
			session: { findFirst: vi.fn() }
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

vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn(),
	clearProExpiration: vi.fn(),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(false),
	getProStatus: vi.fn().mockResolvedValue({ isPro: false, expirationDate: null })
}));

const {
	uploadResistanceModeScript,
	uploadInstaller,
	getLatestResistanceScript,
	incrementResistanceScriptDownloadCount
} = vi.hoisted(() => ({
	uploadResistanceModeScript: vi.fn(),
	uploadInstaller: vi.fn(),
	getLatestResistanceScript: vi.fn(),
	incrementResistanceScriptDownloadCount: vi.fn().mockResolvedValue(undefined)
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
		uploadInstaller,
		deleteResistanceModeScript: vi.fn(),
		deleteInstaller: vi.fn()
	};
});

// cache.ts touches the db at import; keep its real behavior but stub the
// invalidation helpers and the "latest release" getters the public route uses.
vi.mock('$lib/server/cache', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cache')>();
	return {
		...actual,
		invalidateResistanceCache: vi.fn().mockResolvedValue(null),
		invalidateInstallerCache: vi.fn().mockResolvedValue(null),
		getLatestResistanceScript,
		incrementResistanceScriptDownloadCount
	};
});

import { adminRouter } from './admin';
import { scriptsRouter } from './scripts';

function adminHandle(path: string, init?: RequestInit) {
	// The adminRouter carries the /admin prefix itself.
	return adminRouter.handle(new Request(`http://localhost${path}`, init));
}

function uploadBody(file: File, fields: Record<string, string>): FormData {
	const form = new FormData();
	form.append('file', file);
	for (const [key, value] of Object.entries(fields)) form.append(key, value);
	return form;
}

describe('admin release uploads', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked((await import('$lib/server/auth')).auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'admin' } as never
		});
	});

	it('stages a resistance upload: not downloadable until marked', async () => {
		uploadResistanceModeScript.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: 'https://cdn/x.zip', hash: 'abc' })
		} as never);

		const res = await adminHandle('/admin/resistance/upload', {
			method: 'POST',
			body: uploadBody(validZip, { version: '2026-09-01' })
		});
		expect(res.status).toBe(200);
		// The uploader must be told the release starts NOT downloadable.
		expect(uploadResistanceModeScript).toHaveBeenCalledWith(
			expect.any(File),
			'2026-09-01',
			false
		);
	});

	it('stages an installer upload: not downloadable until marked', async () => {
		uploadInstaller.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: 'https://cdn/x.exe', hash: 'abc' })
		} as never);

		const res = await adminHandle('/admin/installers/upload', {
			method: 'POST',
			body: uploadBody(validZip, {
				version: '1.0.0',
				os: 'windows',
				architecture: 'x64'
			})
		});
		expect(res.status).toBe(200);
		expect(uploadInstaller).toHaveBeenCalledWith(
			expect.any(File),
			'1.0.0',
			'windows',
			'x64',
			false
		);
	});
});

describe('admin set-downloadable lifecycle', () => {
	beforeEach(async () => {
		vi.clearAllMocks();
		vi.mocked((await import('$lib/server/auth')).auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'admin' } as never
		});
	});

	function updateChain() {
		return {
			set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) })
		} as unknown as { set: ReturnType<typeof vi.fn> };
	}

	function markDownloadable(path: string, id: string, canBeDownloaded: boolean) {
		return adminHandle(path, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, canBeDownloaded })
		});
	}

	it('marks a resistance release downloadable', async () => {
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.resistanceModeScripts.findFirst).mockResolvedValue({
			id: 'r1'
		} as never);
		vi.mocked(db.update).mockReturnValue(updateChain() as never);

		const res = await markDownloadable('/admin/resistance/set-downloadable', 'r1', true);
		expect(res.status).toBe(200);
		expect(db.update).toHaveBeenCalled();
	});

	it('revokes a resistance release', async () => {
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.resistanceModeScripts.findFirst).mockResolvedValue({
			id: 'r1'
		} as never);
		const chain = updateChain();
		vi.mocked(db.update).mockReturnValue(chain as never);

		const res = await markDownloadable('/admin/resistance/set-downloadable', 'r1', false);
		expect(res.status).toBe(200);
		expect((chain.set as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({
			canBeDownloaded: false
		});
	});

	it('resistance set-downloadable 404s for an unknown release and rejects a missing id', async () => {
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.resistanceModeScripts.findFirst).mockResolvedValue(null as never);

		expect(
			(await markDownloadable('/admin/resistance/set-downloadable', 'nope', true)).status
		).toBe(404);
		// A missing id never reaches the handler: Elysia rejects the body with
		// 422 (the handler's own 400 branch is defense-in-depth for callers
		// that bypass HTTP validation).
		expect(
			(
				await adminHandle('/admin/resistance/set-downloadable', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ canBeDownloaded: true })
				})
			).status
		).toBe(422);
	});

	it('marks an installer release downloadable', async () => {
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.aceBlockerInstaller.findFirst).mockResolvedValue({
			id: 'w1'
		} as never);
		vi.mocked(db.update).mockReturnValue(updateChain() as never);

		const res = await markDownloadable('/admin/installers/set-downloadable', 'w1', true);
		expect(res.status).toBe(200);
		expect(db.update).toHaveBeenCalled();
	});

	it('installer set-downloadable 404s for an unknown release', async () => {
		const { db } = await import('$lib/server/db');
		vi.mocked(db.query.aceBlockerInstaller.findFirst).mockResolvedValue(null as never);

		const res = await markDownloadable('/admin/installers/set-downloadable', 'nope', true);
		expect(res.status).toBe(404);
	});
});

describe('public gating (canBeDownloaded drives the public routes)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	function scriptsHandle() {
		return scriptsRouter.handle(new Request('http://localhost/scripts/resistance-mode'));
	}

	it('refuses a pro-gated release to a non-pro user with 403', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { id: 'u1' } as never
		});

		const res = await scriptsHandle();
		expect(res.status).toBe(403);
	});

	it('404s when no release is marked downloadable (revoked or never published)', async () => {
		const { auth } = await import('$lib/server/auth');
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { id: 'u1' } as never
		});
		vi.mocked(isUserPro).mockResolvedValue(true);
		getLatestResistanceScript.mockReturnValue(null as never);

		const res = await scriptsHandle();
		expect(res.status).toBe(404);
		expect(incrementResistanceScriptDownloadCount).not.toHaveBeenCalled();
	});

	it('serves a signed URL once the release is marked downloadable', async () => {
		const { auth } = await import('$lib/server/auth');
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { id: 'u1' } as never
		});
		vi.mocked(isUserPro).mockResolvedValue(true);
		getLatestResistanceScript.mockReturnValue({
			id: 'r1',
			version: '2026-09-01',
			fileName: 'resistance-mode-scripts.zip',
			sha256: 'abc',
			size: 123,
			canBeDownloaded: true
		} as never);

		const res = await scriptsHandle();
		expect(res.status).toBe(200);
		const body = (await res.json()) as { url: string; version: string; sha256: string };
		expect(body.version).toBe('2026-09-01');
		expect(body.url).toContain('/dev/resistance-mode-scripts/2026-09-01/');
		expect(body.url).toContain('token=');
		expect(incrementResistanceScriptDownloadCount).toHaveBeenCalledOnce();
	});
});
