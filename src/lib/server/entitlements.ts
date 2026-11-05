import crypto from 'node:crypto';
import { getProStatus } from './pro';

/** Signed Pro lease bound to the API key (not to any particular device). */
export const LEASE_SECONDS = 24 * 60 * 60;
export const OFFLINE_GRACE_SECONDS = 72 * 60 * 60;
export const PRO_FEATURES = [
	'custom_site_packs', 'premium_site_packs', 'resistance_mode', 'cloud_backup'
] as const;

const encode = (data: object): string => Buffer.from(JSON.stringify(data)).toString('base64url');

export async function issueEntitlement(
	userId: string,
	apiKey: string,
	privateKeyBase64 = process.env.ACE_ENTITLEMENT_SIGNING_KEY_BASE64
): Promise<string | null> {
	const pro = await getProStatus(userId);
	if (!pro.isPro || !pro.expirationDate || pro.expirationDate.getTime() <= Date.now()) return null;
	if (!privateKeyBase64) throw new Error('Entitlement signing key is not configured');

	const privateKey = crypto.createPrivateKey({
		key: Buffer.from(privateKeyBase64, 'base64'),
		format: 'der',
		type: 'pkcs8'
	});
	const publicKey = crypto.createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
	const configuredPublic = process.env.ACE_ENTITLEMENT_PUBLIC_KEY_BASE64;
	if (configuredPublic) {
		const expected = Buffer.from(configuredPublic, 'base64');
		const actual = publicKey.subarray(-32);
		if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
			throw new Error('Entitlement key pair mismatch');
		}
	}
	const now = Math.floor(Date.now() / 1000);
	const expires = Math.min(now + LEASE_SECONDS, Math.floor(pro.expirationDate.getTime() / 1000));
	const payload = {
		iss: 'aceblocker.com', sub: userId,
		key_sha256: crypto.createHash('sha256').update(apiKey).digest('hex'),
		iat: now, exp: expires, offline_until: expires + OFFLINE_GRACE_SECONDS,
		features: PRO_FEATURES
	};
	const body = `${encode({ alg: 'EdDSA', typ: 'ACE-ENTITLEMENT', kid: 'ace-v1' })}.${encode(payload)}`;
	const signature = crypto.sign(null, Buffer.from(body), privateKey).toString('base64url');
	return `${body}.${signature}`;
}
