import { describe, expect, it, vi, beforeEach } from 'vitest';

const mock = vi.hoisted(() => ({
	state: 'approved',
	issued: 0,
	createApiKey: vi.fn()
}));
vi.mock('$lib/server/auth', () => ({
	auth: { api: { createApiKey: mock.createApiKey } }
}));
vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			deviceLinks: {
				findFirst: async () => ({
					status: mock.state,
					expiresAt: new Date(Date.now() + 60_000)
				})
			}
		},
		update: () => ({
			set: (data: { status?: string }) => ({
				where: () => ({
					returning: async () => {
						if (data.status === 'redeeming' && mock.state === 'approved') {
							mock.state = 'redeeming';
							return [{ userId: 'user-1' }];
						}
						if (data.status === 'consumed') {
							mock.state = 'consumed';
						}
						return [];
					}
				})
			})
		})
	}
}));

import { hashLinkCode, newUserCode, normalizeUserCode, pollDeviceLink } from './device-link';

describe('secure device linking', () => {
	beforeEach(() => {
		mock.state = 'approved';
		mock.issued = 0;
		mock.createApiKey.mockReset();
		mock.createApiKey.mockResolvedValue({ key: 'secret-issued-once' });
	});

	it('uses a high-entropy human code and normalizes only its visible separators', () => {
		const codes = new Set<string>();
		for (let i = 0; i < 200; i++) {
			const code = newUserCode();
			expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){2}$/);
			codes.add(code);
			expect(normalizeUserCode(code.toLowerCase())).toBe(code.replaceAll('-', ''));
		}
		expect(codes.size).toBe(200);
		expect(normalizeUserCode('wrong')).toBeNull();
		expect(normalizeUserCode('AAAAAAAAAAAA!')).toBeNull();
	});

	it('hashes the native device secret rather than storing it directly', () => {
		expect(hashLinkCode('private-token')).toHaveLength(64);
		expect(hashLinkCode('private-token')).not.toContain('private-token');
	});

	it('redeems the approved grant only once and never returns the API key on replay', async () => {
		const challenge = 'A'.repeat(43);
		expect(await pollDeviceLink(challenge)).toEqual({
			state: 'authorized',
			apiKey: 'secret-issued-once'
		});
		expect(await pollDeviceLink(challenge)).toEqual({ state: 'consumed' });
		expect(mock.createApiKey).toHaveBeenCalledTimes(1);
	});

	it('rejects malformed native secrets without touching the authentication provider', async () => {
		expect(await pollDeviceLink('short')).toEqual({ state: 'expired' });
		expect(mock.createApiKey).not.toHaveBeenCalled();
	});
});
