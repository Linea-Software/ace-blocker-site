import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { DesktopReleaseError } from '$lib/server/desktop-update-security';

const mocks = vi.hoisted(() => ({
	getLatestDesktopEnvelope: vi.fn(),
	stageDesktopRelease: vi.fn(),
	getSession: vi.fn(),
	publishDesktopRelease: vi.fn(),
	withdrawDesktopRelease: vi.fn()
}));

vi.mock('$lib/server/cache', () => ({
	getLatestDesktopEnvelope: mocks.getLatestDesktopEnvelope
}));
vi.mock('$lib/server/desktop-update-service', () => ({
	stageDesktopRelease: mocks.stageDesktopRelease,
	publishDesktopRelease: mocks.publishDesktopRelease,
	withdrawDesktopRelease: mocks.withdrawDesktopRelease
}));
vi.mock('$lib/server/auth', () => ({
	auth: { api: { getSession: mocks.getSession } }
}));
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })
}));

import { desktopReleasesRouter } from './desktop-releases';
import { desktopAdminRouter } from './admin/desktop';

const envelope = {
	payload: Buffer.from('signed-payload').toString('base64'),
	signature: Buffer.alloc(64).toString('base64'),
	key_id: 'ace-stable-v1'
};
const TOKEN = 'not-a-production-token';

function request(method: string, path: string, payload?: unknown, authorization?: string) {
	return new Request('http://localhost' + path, {
		method,
		...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
		headers: {
			...(payload === undefined
				? {}
				: {
						'content-type': 'application/json',
						'content-length': String(Buffer.byteLength(JSON.stringify(payload)))
					}),
			...(authorization ? { authorization } : {})
		}
	});
}
function body() {
	return {
		envelope,
		size: 100,
		stagingKey: 'desktop-updates/1.10.0/' + 'a'.repeat(64) + '.msi'
	};
}

const previous = {
	ACE_DESKTOP_UPDATES_ENABLED: process.env.ACE_DESKTOP_UPDATES_ENABLED,
	ACE_RELEASE_INGEST_TOKEN: process.env.ACE_RELEASE_INGEST_TOKEN,
	ACE_DESKTOP_UPDATE_PUBLIC_KEYS: process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS,
	ACE_DESKTOP_PUBLISHER_CERT_SHA256: process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256
};
beforeEach(() => {
	vi.clearAllMocks();
	process.env.ACE_DESKTOP_UPDATES_ENABLED = 'true';
	process.env.ACE_RELEASE_INGEST_TOKEN = TOKEN;
	process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS = '{"ace-stable-v1":"' + 'a'.repeat(64) + '"}';
	process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256 = 'b'.repeat(64);
	mocks.getLatestDesktopEnvelope.mockReturnValue(envelope);
	mocks.stageDesktopRelease.mockResolvedValue('uuid-1');
	mocks.publishDesktopRelease.mockResolvedValue(undefined);
	mocks.withdrawDesktopRelease.mockResolvedValue(undefined);
	mocks.getSession.mockResolvedValue(null);
});
afterEach(() => {
	for (const [name, value] of Object.entries(previous)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
});

describe('account-independent public updater API', () => {
	it('serves the exact signed envelope without login, api key or Pro', async () => {
		const result = await desktopReleasesRouter.handle(
			request('GET', '/releases/desktop/latest')
		);
		expect(result.status).toBe(200);
		expect(await result.json()).toEqual(envelope);
		expect(result.headers.get('etag')).toMatch(/^"[0-9a-f]{64}"$/);
		expect(mocks.getSession).not.toHaveBeenCalled();
	});
	it('supports ETag revalidation and rejects mismatched targets', async () => {
		const first = await desktopReleasesRouter.handle(
			request('GET', '/releases/desktop/latest')
		);
		const unchanged = await desktopReleasesRouter.handle(
			new Request(
				'http://localhost/releases/desktop/latest?os=windows&architecture=x64&channel=stable',
				{ headers: { 'if-none-match': first.headers.get('etag')! } }
			)
		);
		expect(unchanged.status).toBe(304);
		const mismatch = await desktopReleasesRouter.handle(
			request('GET', '/releases/desktop/latest?os=linux')
		);
		expect(mismatch.status).toBe(400);
	});
	it('returns no signed release when none has passed publication, or updates are disabled', async () => {
		mocks.getLatestDesktopEnvelope.mockReturnValue(null);
		const missing = await desktopReleasesRouter.handle(
			request('GET', '/releases/desktop/latest')
		);
		expect(missing.status).toBe(204);
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'false';
		const disabled = await desktopReleasesRouter.handle(
			request('GET', '/releases/desktop/latest')
		);
		expect(disabled.status).toBe(503);
	});
	it('requires a constant-time bearer token for signed ingest', async () => {
		const unauthorized = await desktopReleasesRouter.handle(
			request('POST', '/releases/ingest/desktop', body())
		);
		expect(unauthorized.status).toBe(401);
		expect(mocks.stageDesktopRelease).not.toHaveBeenCalled();
		const accepted = await desktopReleasesRouter.handle(
			request('POST', '/releases/ingest/desktop', body(), 'Bearer ' + TOKEN)
		);
		expect(accepted.status).toBe(201);
		expect(await accepted.json()).toMatchObject({ success: true, state: 'staged' });
	});
	it('rejects unknown-length or oversized JSON before body validation', async () => {
		const candidate = body();
		const missingLength = new Request('http://localhost/releases/ingest/desktop', {
			method: 'POST',
			body: JSON.stringify(candidate),
			headers: { authorization: 'Bearer ' + TOKEN, 'content-type': 'application/json' }
		});
		expect((await desktopReleasesRouter.handle(missingLength)).status).toBe(411);
		const huge = request('POST', '/releases/ingest/desktop', candidate, 'Bearer ' + TOKEN);
		huge.headers.set('content-length', '16385');
		expect((await desktopReleasesRouter.handle(huge)).status).toBe(413);
		expect(mocks.stageDesktopRelease).not.toHaveBeenCalled();
	});
	it('maps duplicate release and CDN verification errors safely', async () => {
		mocks.stageDesktopRelease.mockRejectedValueOnce(
			new DesktopReleaseError('conflict', 'duplicate')
		);
		const duplicate = await desktopReleasesRouter.handle(
			request('POST', '/releases/ingest/desktop', body(), 'Bearer ' + TOKEN)
		);
		expect(duplicate.status).toBe(409);
		mocks.stageDesktopRelease.mockRejectedValueOnce(
			new DesktopReleaseError('unavailable', 'CDN unavailable')
		);
		const unavailable = await desktopReleasesRouter.handle(
			request('POST', '/releases/ingest/desktop', body(), 'Bearer ' + TOKEN)
		);
		expect(unavailable.status).toBe(503);
	});
});

describe('admin API enforces runtime session identity', () => {
	it('rejects unauthenticated and non-admin publisher', async () => {
		let result = await desktopAdminRouter.handle(
			request('POST', '/installers/publish-desktop', { id: 'uuid-1' })
		);
		expect(result.status).toBe(403);
		mocks.getSession.mockResolvedValueOnce({ user: { id: 'u1', role: 'user' } });
		result = await desktopAdminRouter.handle(
			request('POST', '/installers/publish-desktop', { id: 'uuid-1' })
		);
		expect(result.status).toBe(403);
		expect(mocks.publishDesktopRelease).not.toHaveBeenCalled();
	});
	it('records the authorized publisher identity and supports withdrawal', async () => {
		mocks.getSession.mockResolvedValue({ user: { id: 'admin-1', role: 'admin' } });
		let result = await desktopAdminRouter.handle(
			request('POST', '/installers/publish-desktop', { id: 'uuid-1' })
		);
		expect(result.status).toBe(200);
		expect(mocks.publishDesktopRelease).toHaveBeenCalledWith('uuid-1', 'admin-1');
		result = await desktopAdminRouter.handle(
			request('POST', '/installers/withdraw-desktop', { id: 'uuid-1' })
		);
		expect(result.status).toBe(200);
		expect(mocks.withdrawDesktopRelease).toHaveBeenCalledWith('uuid-1', 'admin-1');
	});
});
