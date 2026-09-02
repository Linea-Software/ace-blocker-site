import { describe, it, expect, vi } from 'vitest';
import { app } from './app';

// The real auth module instantiates Better Auth + DodoPayments and reads the
// database; stub it so these unit tests exercise the current Elysia routing
// without a live DB or a session cookie.
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

// Routers import $lib/server/db (via pro.ts) at module load; stub it so the
// tests don't require DATABASE_URL or a live Postgres.
vi.mock('$lib/server/db', () => ({
	db: {
		query: {
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

// cdn/common.ts throws at import unless every Bunny env var is present.
vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

describe('Elysia API', () => {
	const handle = (path: string, method = 'GET') =>
		app.handle(new Request(`http://localhost${path}`, { method }));

	it('GET /api/v1/scripts/resistance-mode requires an authenticated session', async () => {
		const res = await handle('/api/v1/scripts/resistance-mode');
		expect(res.status).toBe(401);
	});

	it('POST /api/v1/account/verify-pro requires an authenticated session', async () => {
		const res = await handle('/api/v1/account/verify-pro', 'POST');
		expect(res.status).toBe(401);
	});

	it('POST /api/v1/account/revoke-session requires an authenticated session', async () => {
		const res = await app.handle(
			new Request('http://localhost/api/v1/account/revoke-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: 'test-session-id' })
			})
		);
		expect(res.status).toBe(401);
	});
});
