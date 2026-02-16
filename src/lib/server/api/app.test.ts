import { describe, it, expect, vi, beforeAll } from 'vitest';
import { app } from './app';

// Mock state using vi.hoisted to share between mock factory and tests
const { mockDbState } = vi.hoisted(() => ({
    mockDbState: new Map<string, { createdAt: Date }>()
}));

// Mock drizzle-orm to make inspection easier
vi.mock('drizzle-orm', async (importOriginal) => {
    const actual = await importOriginal<typeof import('drizzle-orm')>();
    return {
        ...actual,
        eq: vi.fn().mockImplementation((col, val) => ({ __val: val }))
    };
});

// Mock DB for Trials
vi.mock('$lib/server/db', () => ({
    db: {
        query: {
            pcTrials: {
                findFirst: vi.fn().mockImplementation(async ({ where }) => {
                    const queriedId = where?.__val;
                    const record = mockDbState.get(queriedId);
                    if (record) {
                        return { id: 1, pcIdentifier: queriedId, createdAt: record.createdAt };
                    }
                    return null;
                })
            }
        },
        insert: vi.fn().mockReturnValue({
            values: vi.fn().mockImplementation(async (vals) => {
                mockDbState.set(vals.pcIdentifier, { createdAt: new Date() });
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
        // Recently used PC
        mockDbState.set('used-pc', { createdAt: new Date() });
        // Long ago used PC (more than 14 days)
        mockDbState.set('ended-pc', { createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) });
    });


    it('GET /api/v1/trials/check/:pcId returns in_progress for recently used PC', async () => {
        const res = await app.request('/api/v1/trials/check/used-pc');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ status: 'in_progress' });
    });

    it('GET /api/v1/trials/check/:pcId returns ended for old PC', async () => {
        const res = await app.request('/api/v1/trials/check/ended-pc');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ status: 'ended' });
    });

    it('GET /api/v1/trials/check/:pcId returns not_used for unused PC', async () => {
        const res = await app.request('/api/v1/trials/check/new-pc');
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data).toEqual({ status: 'not_used' });
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
