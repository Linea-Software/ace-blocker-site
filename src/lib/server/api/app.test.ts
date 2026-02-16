import { describe, it, expect, vi } from 'vitest';
import { app } from './app';

// Mock dodoPayments in auth.ts if necessary, but let's try running against real dev env logic first
// or at least handle the env vars.

// For now, let's assume we want to test the routing logic.
// If dodoPayments requires secrets, we might need to mock it to avoid failures in CI/test environment without secrets.

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
        BUNNY_SECURITY_KEY: 'test-secret-key'
    }
}));

describe('Hono API', () => {
    it('GET /v1/licenses/:key returns validation result', async () => {
        const res = await app.request('/v1/licenses/valid-key');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ valid: true });

        const resInvalid = await app.request('/v1/licenses/invalid-key');
        expect(resInvalid.status).toBe(200);
        const dataInvalid = await resInvalid.json();
        expect(dataInvalid).toEqual({ valid: false });
    });

    it('GET /v1/scripts/boredom returns download url for valid license', async () => {
        const res = await app.request('/v1/scripts/boredom?licenseKey=valid-key');
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain('https://cdn.aceblocker.com/boredom-scripts.zip');
        expect(text).toContain('token=');
    });

    it('GET /v1/scripts/boredom returns 403 for invalid license', async () => {
        const res = await app.request('/v1/scripts/boredom?licenseKey=invalid-key');
        expect(res.status).toBe(403);
    });

    it('GET /v1/scripts/boredom requires licenseKey', async () => {
        const res = await app.request('/v1/scripts/boredom');
        expect(res.status).toBe(400);
    });
});
