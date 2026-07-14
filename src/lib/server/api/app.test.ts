import { describe, it, expect, vi } from 'vitest';
import { app } from './app';

vi.mock('$lib/server/auth', () => {
	return {
		dodoPayments: {
			licenses: {
				validate: vi.fn().mockImplementation(async ({ license_key }) => {
					if (license_key === 'valid-key') {
						return { valid: true };
					}
					return { valid: false };
				})
			}
		}
	};
});

// Mock environment variables for scripts router
vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-secret-key'
	}
}));

describe('Elysia API', () => {
	const handle = (path: string, method = 'GET') =>
		app.handle(new Request(`http://localhost${path}`, { method }));

	it('GET /api/v1/licenses/:key returns validation result', async () => {
		const res = await handle('/api/v1/licenses/valid-key');
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data).toEqual({ valid: true });

		const resInvalid = await handle('/api/v1/licenses/invalid-key');
		expect(resInvalid.status).toBe(200);
		const dataInvalid = await resInvalid.json();
		expect(dataInvalid).toEqual({ valid: false });
	});

	it('GET /api/v1/scripts/resistance-mode returns download url and version for valid license', async () => {
		const res = await handle('/api/v1/scripts/resistance-mode?licenseKey=valid-key');
		expect(res.status).toBe(200);
		const data = await res.json();
		expect(data.url).toContain('https://cdn.aceblocker.com/premium/resistance-scripts.zip');
		expect(data.url).toContain('token=');
		expect(data.version).toBe('0.1.0');
	});

	it('GET /api/v1/scripts/resistance-mode returns 403 for invalid license', async () => {
		const res = await handle('/api/v1/scripts/resistance-mode?licenseKey=invalid-key');
		expect(res.status).toBe(403);
	});

	it('GET /api/v1/scripts/resistance-mode requires licenseKey', async () => {
		const res = await handle('/api/v1/scripts/resistance-mode');
		expect(res.status).toBe(400);
	});
});
