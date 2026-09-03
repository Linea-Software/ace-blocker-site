import { describe, it, expect, vi, beforeEach } from 'vitest';

// Backups round-trip (spec §10.x / release plan Step 5.2): create (pro only),
// fetch, delete — and the payload must survive POST → DB → GET unchanged.
// Router-level tests: auth, pro and db are mocked; the db mock records the
// inserted payload so the fetch path can prove the round-trip.

const { dbInsert, dbSelect, dbDelete } = vi.hoisted(() => ({
	dbInsert: vi.fn(),
	dbSelect: vi.fn(),
	dbDelete: vi.fn()
}));

function insertChain() {
	const chain: any = {
		values: vi.fn(() => chain),
		onConflictDoUpdate: vi.fn(() => chain),
		returning: vi.fn(() => Promise.resolve([{ id: 'backup-1' }])),
		then: undefined
	};
	// Elysia awaits the insert chain directly (no .returning() call).
	chain.then = (resolve: (v: unknown) => void) => resolve(undefined);
	return chain;
}

function selectChain(rows: unknown[]) {
	const chain: any = {
		from: () => chain,
		where: () => chain,
		orderBy: () => chain,
		limit: vi.fn(() => Promise.resolve(rows))
	};
	return chain;
}

function deleteChain() {
	const chain: any = {
		where: vi.fn(() => Promise.resolve())
	};
	return chain;
}

dbInsert.mockImplementation(() => insertChain());
dbSelect.mockImplementation(() => selectChain([]));
dbDelete.mockImplementation(() => deleteChain());

vi.mock('$lib/server/db', () => ({
	db: {
		query: { user: { findFirst: vi.fn() }, session: { findFirst: vi.fn() } },
		select: dbSelect,
		insert: dbInsert,
		update: vi.fn(),
		delete: dbDelete
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

vi.mock('$lib/server/pro', () => ({
	updateProExpiration: vi.fn(),
	clearProExpiration: vi.fn(),
	invalidateProCache: vi.fn(),
	isUserPro: vi.fn().mockResolvedValue(false),
	getProStatus: vi.fn().mockResolvedValue({ isPro: false, expirationDate: null })
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

import { backupsRouter } from './backups';
import { accountRouter } from './account';
import { backups as backupsTable } from '$lib/server/db/schema';

function handle(path: string, init?: RequestInit) {
	// The backupsRouter carries the /backups prefix itself.
	return backupsRouter.handle(new Request(`http://localhost/backups${path}`, init));
}

const ENGINE_BACKUP = {
	version: '1.0.0',
	customSitesLists: [
		{
			id: '4e2f4a6f-8f3a-4c1e-9d5b-2b7a0f1c3d5e',
			name: 'My Custom List',
			description: null,
			sources: [{ source: 'https://example.com/list.txt', sourceType: 'url', format: 'hosts' }]
		}
	],
	networkBlocks: [
		{
			id: 'b1f2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
			name: 'Evening Lock',
			safe_search: true,
			icon: null,
			schedules: [
				{
					startTime: '22:00',
					endTime: '06:00',
					monday: true,
					tuesday: true,
					wednesday: true,
					thursday: true,
					friday: true,
					saturday: true,
					sunday: true
				}
			],
			userRules: ['example.com', 'pornhub.com'],
			connectedSitesLists: ['4e2f4a6f-8f3a-4c1e-9d5b-2b7a0f1c3d5e']
		}
	],
	deactivatedResistanceModeScripts: ['com.youtube.audio_delay']
};

function jsonPost(path: string, body: unknown, headers: Record<string, string> = {}) {
	return handle(path, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
}

async function asUser() {
	const { auth } = await import('$lib/server/auth');
	vi.mocked(auth.api.getSession).mockResolvedValue({
		session: {} as never,
		user: { id: 'user-1', email: 'user@example.com' } as never
	});
}

describe('backups endpoints', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// clearAllMocks keeps implementations; reset the defaults explicitly so
		// a previous test's row fixtures never leak into the next one.
		dbInsert.mockImplementation(() => insertChain());
		dbSelect.mockImplementation(() => selectChain([]));
		dbDelete.mockImplementation(() => deleteChain());
	});

	it('create requires a signed-in user (401)', async () => {
		const res = await jsonPost('/', ENGINE_BACKUP);
		expect(res.status).toBe(401);
	});

	it('create requires a Pro license (403)', async () => {
		await asUser();
		const res = await jsonPost('/', ENGINE_BACKUP);
		expect(res.status).toBe(403);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('rejects an oversized backup with 413', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const big = { ...ENGINE_BACKUP, version: 'x'.repeat(3 * 1024 * 1024) };
		const res = await jsonPost('/', big, { 'content-length': String(JSON.stringify(big).length) });
		expect(res.status).toBe(413);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('create stores the payload for a Pro user and returns an id', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const res = await jsonPost('/', ENGINE_BACKUP);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { id: string };
		expect(body.id).toBeTruthy();

		// The whole engine payload is stored, stringified.
		const insertCall = dbInsert.mock.calls[0][0];
		const values = insertChainValues(dbInsert);
		expect(values.data).toBe(JSON.stringify(ENGINE_BACKUP));
		expect(values.version).toBe('1.0.0');
		expect(values.userId).toBe('user-1');
		expect(insertCall).toBeDefined();
	});

	it('accepts backups whose site packs use canonical catalog ids (non-UUID)', async () => {
		// Regression: engine exports include built-in/default packs identified
		// by catalog ids such as `pack-adult-free` (never UUIDs), and network
		// blocks reference them the same way. The upload must not be rejected
		// by a UUID-format constraint — the site stores the blob verbatim.
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const defaultPacksBackup = {
			version: '1.0.0',
			customSitesLists: [
				{
					id: 'pack-adult-free',
					name: 'Adult Websites — Free',
					description: null,
					sources: [
						{
							source: 'https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts',
							sourceType: 'url',
							format: 'hosts'
						}
					]
				},
				{
					id: '4e2f4a6f-8f3a-4c1e-9d5b-2b7a0f1c3d5e',
					name: 'My Custom List',
					description: null,
					sources: []
				}
			],
			networkBlocks: [
				{
					id: 'b1f2c3d4-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
					name: 'Default-backed block',
					safe_search: false,
					icon: null,
					schedules: [],
					userRules: [],
					connectedSitesLists: ['pack-adult-free', '4e2f4a6f-8f3a-4c1e-9d5b-2b7a0f1c3d5e']
				}
			],
			deactivatedResistanceModeScripts: []
		};

		const res = await jsonPost('/', defaultPacksBackup);
		expect(res.status).toBe(200);
		expect(dbInsert).toHaveBeenCalled();
	});

	it('rejects empty site-pack ids as invalid identifiers', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const bad = {
			version: '1.0.0',
			customSitesLists: [
				{
					id: '',
					name: 'No id',
					description: null,
					sources: []
				}
			],
			networkBlocks: [],
			deactivatedResistanceModeScripts: []
		};

		const res = await jsonPost('/', bad);
		expect(res.status).not.toBe(200);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('fetch round-trips the payload: what was stored comes back unchanged', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		// Simulate the DB: the fetch returns exactly what create stored.
		const stored = {
			id: 'backup-1',
			userId: 'user-1',
			data: JSON.stringify(ENGINE_BACKUP),
			version: '1.0.0',
			createdAt: new Date('2026-09-01T00:00:00Z')
		};
		dbSelect.mockImplementation(() => selectChain([stored]));

		const res = await handle('/', { method: 'GET' });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(ENGINE_BACKUP);
	});

	it('fetch returns 404 when no backup exists', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const res = await handle('/', { method: 'GET' });
		expect(res.status).toBe(404);
	});

	it('fetch is pro-only and requires auth', async () => {
		// clearAllMocks keeps implementations — force an unauthenticated state.
		const { auth } = await import('$lib/server/auth');
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(auth.api.getSession).mockResolvedValue(null);
		vi.mocked(isUserPro).mockResolvedValue(false);
		expect((await handle('/', { method: 'GET' })).status).toBe(401);

		await asUser();
		const res = await handle('/', { method: 'GET' });
		expect(res.status).toBe(403);
	});
});

describe('backup deletion via account deletion', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('deleting the account removes the stored backup', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { id: 'user-1', email: 'user@example.com' } as never
		});
		dbDelete.mockImplementation(() => deleteChain());

		const res = await accountRouter.handle(
			new Request('http://localhost/account/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'user@example.com' })
			})
		);
		expect(res.status).toBe(200);
		// backups is one of the four tables removed alongside the user.
		const deletedTables = dbDelete.mock.calls.map((call) => call[0]);
		expect(deletedTables).toContain(backupsTable);
		expect(dbDelete).toHaveBeenCalledTimes(4);
	});
});

/** Pull the values object passed to db.insert(...).values(...). */
function insertChainValues(dbInsertMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const valuesFn = dbInsertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
	return valuesFn.mock.calls[0][0] as Record<string, unknown>;
}
