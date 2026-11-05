import { describe, it, expect, vi } from 'vitest';
import crypto from 'node:crypto';
import { issueEntitlement, LEASE_SECONDS, OFFLINE_GRACE_SECONDS } from './entitlements';
import { getProStatus } from './pro';

vi.mock('./pro', () => ({ getProStatus: vi.fn() }));

function fixture() {
	const keys = crypto.generateKeyPairSync('ed25519');
	const pkcs8 = keys.privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
	return { keys, pkcs8 };
}

describe('signed Pro entitlements', () => {
	it('only issues signed, API-key-bound leases for an active Pro account', async () => {
		const { keys, pkcs8 } = fixture();
		vi.mocked(getProStatus).mockResolvedValue({ isPro: true, expirationDate: new Date(Date.now() + 10 * 86400000) });
		const lease = await issueEntitlement('paid-user', 'desktop-key', pkcs8);
		expect(lease).toBeTruthy();
		const [header, payload, signature] = lease!.split('.');
		const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
		expect(JSON.parse(Buffer.from(header, 'base64url').toString()).alg).toBe('EdDSA');
		expect(decoded.key_sha256).toBe(crypto.createHash('sha256').update('desktop-key').digest('hex'));
		expect(decoded.exp - decoded.iat).toBe(LEASE_SECONDS);
		expect(decoded.offline_until - decoded.exp).toBe(OFFLINE_GRACE_SECONDS);
		expect(crypto.verify(null, Buffer.from(`${header}.${payload}`), keys.publicKey, Buffer.from(signature, 'base64url'))).toBe(true);
		expect(crypto.verify(null, Buffer.from(`${header}.${payload}X`), keys.publicKey, Buffer.from(signature, 'base64url'))).toBe(false);
	});

	it('never issues a positive lease for Free accounts', async () => {
		vi.mocked(getProStatus).mockResolvedValue({ isPro: false, expirationDate: null });
		expect(await issueEntitlement('free-user', 'free-key')).toBeNull();
	});

	it('never extends the lease beyond the paid billing deadline', async () => {
		const { pkcs8 } = fixture();
		vi.mocked(getProStatus).mockResolvedValue({ isPro: true, expirationDate: new Date(Date.now() + 3600000) });
		const token = await issueEntitlement('paid-user', 'key', pkcs8);
		const data = JSON.parse(Buffer.from(token!.split('.')[1], 'base64url').toString());
		expect(data.exp - data.iat).toBeLessThanOrEqual(3600);
	});
});
