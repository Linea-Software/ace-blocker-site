import { describe, it, expect, vi, beforeAll } from 'vitest';
import { app } from './app';

// Mock drizzle-orm to make inspection easier
vi.mock('drizzle-orm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('drizzle-orm')>();
    return {
        ...actual,
        eq: vi.fn().mockImplementation((col, val) => ({ __val: val }))
    };
});

// Mock state using vi.hoisted to share between mock factory and tests
const { mockDbState } = vi.hoisted(() => ({
    mockDbState: new Set<string>()
}));

// Mock DB for Trials
vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            pcTrials: {
                findFirst: vi.fn().mockImplementation(async ({ where }) => {
                    const queriedId = where?.__val;
                    if (queriedId && mockDbState.has(queriedId)) {
                        return { id: 1, pcIdentifier: queriedId };
                    }
                    return null;
                })
            }
        },
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation(async (vals) => {
                mockDbState.add(vals.pcIdentifier);
                return;
            })
        })
    }
}));

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
    it('GET /api/v1/licenses/:key returns validation result', async () => {
        const res = await app.request('/api/v1/licenses/valid-key');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ valid: true });

        const resInvalid = await app.request('/api/v1/licenses/invalid-key');
        expect(resInvalid.status).toBe(200);
        const dataInvalid = await resInvalid.json();
        expect(dataInvalid).toEqual({ valid: false });
    });

    it('GET /api/v1/scripts/boredom returns download url for valid license', async () => {
        const res = await app.request('/api/v1/scripts/boredom?licenseKey=valid-key');
        expect(res.status).toBe(200);
        const text = await res.text();
        expect(text).toContain('https://cdn.aceblocker.com/boredom-scripts.zip');
        expect(text).toContain('token=');
    });

    it('GET /api/v1/scripts/boredom returns 403 for invalid license', async () => {
        const res = await app.request('/api/v1/scripts/boredom?licenseKey=invalid-key');
        expect(res.status).toBe(403);
    });

    it('GET /api/v1/scripts/boredom requires licenseKey', async () => {
        const res = await app.request('/api/v1/scripts/boredom');
        expect(res.status).toBe(400);
    });
});

describe('Trial API', () => {
    beforeAll(() => {
        mockDbState.clear();
        mockDbState.add('used-pc');
    });

    it('GET /api/v1/trials/check/:pcId returns true for used PC', async () => {
        const res = await app.request('/api/v1/trials/check/used-pc');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ used: true });
    });

    it('GET /api/v1/trials/check/:pcId returns false for unused PC', async () => {
        // The router queries DB. The mock returns null since 'new-pc' is not in set.
        const res = await app.request('/api/v1/trials/check/new-pc');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ used: false });
    });

    it('POST /api/v1/trials/flag adds new PC', async () => {
        const res = await app.request('/api/v1/trials/flag', {
            method: 'POST',
            body: JSON.stringify({ pcId: 'brand-new-pc' }),
            headers: { 'Content-Type': 'application/json' }
        });

        expect(res.status).toBe(200);

        // Verify it was added
        expect(mockDbState.has('brand-new-pc')).toBe(true);
    });
});

