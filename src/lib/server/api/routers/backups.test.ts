import { describe, it, expect, vi, beforeEach } from 'vitest';

// Opaque encrypted cloud backups: server stores ciphertext, nonce, and salt
// separately and reassembles a versioned envelope on fetch. Auth/Pro enforced.

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

const ENCRYPTED_BACKUP = {
	format: 'ace-cloud-e2ee' as const,
	formatVersion: 1 as const,
	algorithm: 'aes-256-gcm' as const,
	kdf: 'argon2id' as const,
	salt: Buffer.alloc(16, 1).toString('base64'),
	nonce: Buffer.alloc(12, 2).toString('base64'),
	ciphertext: Buffer.alloc(64, 3).toString('base64')
};

const PLAINTEXT_BACKUP = {
	version: '1.0.0',
	customSitesLists: [],
	networkBlocks: [],
	deactivatedResistanceModeScripts: []
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
		const res = await jsonPost('/', ENCRYPTED_BACKUP);
		expect(res.status).toBe(401);
	});

	it('create requires a Pro license (403)', async () => {
		await asUser();
		const res = await jsonPost('/', ENCRYPTED_BACKUP);
		expect(res.status).toBe(403);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('rejects an oversized backup with 413', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const big = { ...ENCRYPTED_BACKUP, ciphertext: 'A'.repeat(3 * 1024 * 1024) };
		const res = await jsonPost('/', big, {
			'content-length': String(JSON.stringify(big).length)
		});
		expect(res.status).toBe(413);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('create stores the payload for a Pro user and returns an id', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);

		const res = await jsonPost('/', ENCRYPTED_BACKUP);
		expect(res.status).toBe(200);
		const body = (await res.json()) as { id: string };
		expect(body.id).toBeTruthy();

		// The database stores opaque ciphertext and KDF parameters independently.
		const insertCall = dbInsert.mock.calls[0][0];
		const values = insertChainValues(dbInsert);
		expect(values.data).toBe(ENCRYPTED_BACKUP.ciphertext);
		expect(values.salt).toBe(ENCRYPTED_BACKUP.salt);
		expect(values.nonce).toBe(ENCRYPTED_BACKUP.nonce);
		expect(values.data).not.toContain('salt');
		expect(values.data).not.toContain('nonce');
		expect(values.version).toBe('e2ee-v1');
		expect(values.userId).toBe('user-1');
		expect(insertCall).toBeDefined();
	});

	it('rejects plaintext uploads without storing any user configuration', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);
		const res = await jsonPost('/', PLAINTEXT_BACKUP);
		expect(res.status).not.toBe(200);
		expect(dbInsert).not.toHaveBeenCalled();
	});

	it('fetches an encrypted envelope unchanged for client-side decryption', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);
		dbSelect.mockImplementation(() =>
			selectChain([
				{
					id: 'backup-1',
					userId: 'user-1',
					data: ENCRYPTED_BACKUP.ciphertext,
					salt: ENCRYPTED_BACKUP.salt,
					nonce: ENCRYPTED_BACKUP.nonce,
					version: 'e2ee-v1',
					createdAt: new Date()
				}
			])
		);
		const res = await handle('/', { method: 'GET' });
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual(ENCRYPTED_BACKUP);
	});

	it('rejects malformed encrypted envelopes', async () => {
		await asUser();
		const { isUserPro } = await import('$lib/server/pro');
		vi.mocked(isUserPro).mockResolvedValue(true);
		for (const invalid of [
			{ ...ENCRYPTED_BACKUP, nonce: 'AA==' },
			{ ...ENCRYPTED_BACKUP, salt: '@@@@@' },
			{ ...ENCRYPTED_BACKUP, ciphertext: 'AQ==' },
			{ ...ENCRYPTED_BACKUP, algorithm: 'none' }
		]) {
			const res = await jsonPost('/', invalid);
			expect(res.status).not.toBe(200);
		}
		expect(dbInsert).not.toHaveBeenCalled();
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

	it('does not allow an administrator to delete their account', async () => {
		const { auth } = await import('$lib/server/auth');
		vi.mocked(auth.api.getSession).mockResolvedValue({
			session: {} as never,
			user: { id: 'admin-1', email: 'admin@example.com', role: 'admin' } as never
		});

		const res = await accountRouter.handle(
			new Request('http://localhost/account/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: 'admin@example.com' })
			})
		);

		expect(res.status).toBe(403);
		expect(dbDelete).not.toHaveBeenCalled();
	});
});

/** Pull the values object passed to db.insert(...).values(...). */
function insertChainValues(dbInsertMock: ReturnType<typeof vi.fn>): Record<string, unknown> {
	const valuesFn = dbInsertMock.mock.results[0].value.values as ReturnType<typeof vi.fn>;
	return valuesFn.mock.calls[0][0] as Record<string, unknown>;
}
