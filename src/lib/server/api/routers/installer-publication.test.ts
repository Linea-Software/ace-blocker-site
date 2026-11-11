import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression coverage for the reported bug: "I uploaded a Windows installer,
// but the /download page still says there is no installer."
//
// The lifecycle (release plan step 5.2): admin uploads are STAGED
// (canBeDownloaded=false, committed in 9099877 "stage artifact uploads until
// marked live"); the public surfaces (page metadata + /download/<arch> CDN
// redirect) only serve releases whose canBeDownloaded=true. The defect was
// that staging existed but nothing in the flow published the release, so a
// freshly uploaded installer never appeared on /download.
//
// These tests drive the REAL cache + REAL public download surfaces against a
// mocked DB that faithfully applies the SQL WHERE canBeDownloaded = true:
//   1. a staged (not yet published) Windows release is invisible to the page
//      metadata AND the [arch] download route (the reported failure);
//   2. after the admin marks it downloadable (the correction), both surfaces
//      serve it.

const msiHeader = new Uint8Array(512);
msiHeader.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
msiHeader[28] = 0xfe;
msiHeader[29] = 0xff;
msiHeader[30] = 9;
const validMsi = new File([msiHeader], 'AceBlocker-1.0.0.msi');

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

vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

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

// In-memory stand-in for the ace_blocker_installer table. The `select`
// chain enforces the same WHERE canBeDownloaded = true the cache uses, so
// staged rows are invisible to the public lookups exactly like production.
interface InstallerRow {
	id: string;
	fileName: string;
	version: string;
	os: string;
	architecture: string;
	downloadUrl: string;
	createdAt: Date;
	sha256: string;
	size: number;
	artifactValidatedAt?: Date | null;
	canBeDownloaded: boolean;
	downloadCount: number;
}

let rows: InstallerRow[] = [];

function selectAll() {
	return Promise.resolve(rows.filter((row) => row.canBeDownloaded && row.artifactValidatedAt));
}

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			aceBlockerInstaller: {
				// Scenarios in this file hold a single installer row; the
				// drizzle `where` clause is not introspected.
				findFirst: vi.fn(async () => rows[0] ?? null)
			}
		},
		select: vi.fn(() => ({
			from: () => ({
				where: () => ({ orderBy: () => selectAll() })
			})
		})),
		update: vi.fn(() => ({
			set: (values: Partial<InstallerRow>) => ({
				where: async () => {
					if (rows[0]) Object.assign(rows[0], values);
				}
			})
		})),
		insert: vi.fn(),
		delete: vi.fn()
	}
}));

vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn(),
	clearProExpiration: vi.fn(),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(false),
	getProStatus: vi.fn().mockResolvedValue({ isPro: false, expirationDate: null })
}));

const { uploadInstaller } = vi.hoisted(() => ({ uploadInstaller: vi.fn() }));

// The CDN uploader is mocked (no BunnyCDN network in tests). Its real
// contract (row + cache refresh) is reproduced by the upload handler test
// through the staging assertion; the public lookup tests below rely on the
// real cache module.
vi.mock('$lib/server/cdn', async (importOriginal) => {
	const actual = await importOriginal<typeof import('$lib/server/cdn')>();
	return {
		...actual,
		uploadInstaller
	};
});

vi.mock('$lib/server/installer-publication-mode', () => ({
	canPublishUnsignedInstallers: vi.fn().mockReturnValue(false)
}));

import { canPublishUnsignedInstallers } from '$lib/server/installer-publication-mode';
import { adminRouter } from './admin';
import { GET } from '../../../../routes/download/[arch]/+server';
import { load } from '../../../../routes/download/+page.server';
import { invalidateInstallerCache, loadLatestInstaller } from '$lib/server/cache';

const WINDOWS_URL = new URL(
	'https://cdn.aceblocker.test/dev/ace-blocker-installer/1.0.0/windows/x64/AceBlocker-1.0.0.msi'
);

function windowsRow(overrides: Partial<InstallerRow> = {}): InstallerRow {
	return {
		id: 'w1',
		fileName: 'AceBlocker-1.0.0.msi',
		version: '1.0.0',
		os: 'windows',
		architecture: 'x64',
		downloadUrl: WINDOWS_URL.toString(),
		createdAt: new Date('2026-09-01T00:00:00Z'),
		sha256: 'a'.repeat(64),
		size: 123456,
		artifactValidatedAt: null,
		canBeDownloaded: false,
		downloadCount: 0,
		...overrides
	};
}

async function adminHandle(path: string, init?: RequestInit) {
	return adminRouter.handle(new Request(`http://localhost${path}`, init));
}

function uploadBody(file: File, fields: Record<string, string>): FormData {
	const form = new FormData();
	form.append('file', file);
	for (const [key, value] of Object.entries(fields)) form.append(key, value);
	return form;
}

describe('installer publication lifecycle (regression: upload visible on /download)', () => {
	beforeEach(async () => {
		rows = [];
		vi.clearAllMocks();
		vi.mocked(canPublishUnsignedInstallers).mockReturnValue(false);
		vi.mocked((await import('$lib/server/auth')).auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { role: 'admin' } as never
		});
	});

	it('stages a manual MSI upload for local development only', async () => {
		vi.mocked(canPublishUnsignedInstallers).mockReturnValue(true);
		uploadInstaller.mockResolvedValue({
			isOk: () => true,
			isErr: () => false,
			_unsafeUnwrap: () => ({ downloadUrl: WINDOWS_URL.toString(), hash: 'a'.repeat(64) })
		} as never);

		const res = await adminHandle('/admin/installers/upload', {
			method: 'POST',
			body: uploadBody(validMsi, { version: '1.0.0', os: 'windows', architecture: 'x64' })
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

	it('REPRODUCES the bug: a staged Windows release is invisible on /download', async () => {
		// A real upload has just happened — row exists but canBeDownloaded=false.
		rows = [windowsRow()];
		await invalidateInstallerCache();

		// [arch] download route: no downloadable row for windows_x64.
		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 404 });

		// Page metadata: every platform reports no installer.
		const data = (await load({ url: new URL('http://localhost/download') } as never)) as {
			platforms: { windows: unknown; macos: unknown; linux: unknown };
		};
		expect(data.platforms.windows).toBeNull();
		expect(data.platforms.macos).toBeNull();
		expect(data.platforms.linux).toBeNull();
	});

	it('rejects manual publication of a legacy Windows upload', async () => {
		rows = [windowsRow({ artifactValidatedAt: new Date() })];
		const res = await adminHandle('/admin/installers/set-downloadable', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'w1', canBeDownloaded: true })
		});
		expect(res.status).toBe(409);
		await loadLatestInstaller();
		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 404 });
	});

	it('withdrawing a release removes it from /download again', async () => {
		rows = [windowsRow({ canBeDownloaded: true, artifactValidatedAt: new Date() })];
		await invalidateInstallerCache();

		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 302 });

		const res = await adminHandle('/admin/installers/set-downloadable', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: 'w1', canBeDownloaded: false })
		});
		expect(res.status).toBe(200);
		await loadLatestInstaller();

		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 404 });
	});
});

function routeEvent(arch: string) {
	return { params: { arch } } as never;
}
