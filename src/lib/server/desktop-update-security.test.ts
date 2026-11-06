import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import {
	SIGNED_CONTEXT,
	DesktopReleaseError,
	compareStableVersions,
	expectedDesktopUrl,
	verifyDesktopEnvelope,
	type SignedEnvelope
} from './desktop-update-security';

const keySeed = Buffer.from(
	'9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60',
	'hex'
);
// RFC 8032 test vector 1. Test-only seed, never a production signing identity.
const privateKey = createPrivateKey({
	key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), keySeed]),
	format: 'der',
	type: 'pkcs8'
});
const publicKey = createPublicKey(privateKey);
const publicHex = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32).toString('hex');
const cdn = new URL('https://cdn.example.test/ace-blocker-installer/');
const sha = 'a'.repeat(64),
	publisher = 'b'.repeat(64);

function signed(overrides: Record<string, unknown> = {}, canonical = true): SignedEnvelope {
	const payload = {
		schemaVersion: 1,
		version: '1.10.0',
		channel: 'stable',
		os: 'windows',
		architecture: 'x64',
		packageUrl: expectedDesktopUrl('1.10.0', sha, cdn),
		sha256: sha,
		publisherCertificateSha256: publisher,
		minimumInstalledVersion: null,
		...overrides
	};
	const raw = canonical
		? JSON.stringify(
				Object.fromEntries(Object.entries(payload).sort(([a], [b]) => a.localeCompare(b)))
			)
		: JSON.stringify(payload, null, 2);
	const bytes = Buffer.from(raw);
	return {
		payload: bytes.toString('base64'),
		signature: sign(null, Buffer.concat([SIGNED_CONTEXT, bytes]), privateKey).toString(
			'base64'
		),
		key_id: 'ace-stable-v1'
	};
}

const savedEnv = {
	ACE_DESKTOP_UPDATES_ENABLED: process.env.ACE_DESKTOP_UPDATES_ENABLED,
	ACE_DESKTOP_UPDATE_PUBLIC_KEYS: process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS,
	ACE_DESKTOP_PUBLISHER_CERT_SHA256: process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256
};

describe('Ed25519 desktop release v1 interoperability', () => {
	beforeEach(() => {
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'true';
		process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS = JSON.stringify({ 'ace-stable-v1': publicHex });
		process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256 = publisher;
	});
	afterEach(() => {
		for (const [name, value] of Object.entries(savedEnv)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	it('matches the RFC 8032 vector for the same test public key', () => {
		const signature = Buffer.from(
			'e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e0652249015' +
				'55fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b',
			'hex'
		);
		expect(verify(null, Buffer.alloc(0), publicKey, signature)).toBe(true);
	});

	it('accepts a correctly signed, domain-separated manifest', () => {
		expect(verifyDesktopEnvelope(signed(), cdn).version).toBe('1.10.0');
	});
	it('rejects forged signatures, key changes and payload tampering', () => {
		const e = signed();
		expect(() =>
			verifyDesktopEnvelope({ ...e, signature: Buffer.alloc(64).toString('base64') }, cdn)
		).toThrow(DesktopReleaseError);
		expect(() =>
			verifyDesktopEnvelope({ ...e, payload: Buffer.from('nothing').toString('base64') }, cdn)
		).toThrow(DesktopReleaseError);
		expect(() => verifyDesktopEnvelope({ ...e, key_id: 'another-key' }, cdn)).toThrow(
			DesktopReleaseError
		);
	});
	it('rejects correctly signed but disallowed platform, channel or URL', () => {
		for (const changes of [
			{ channel: 'beta' },
			{ os: 'linux' },
			{ architecture: 'arm64' },
			{ version: '1.10.0-rc.1' },
			{ packageUrl: 'https://evil.test/update.msi' },
			{ sha256: 'f'.repeat(64) },
			{ publisherCertificateSha256: 'c'.repeat(64) },
			{ arbitraryField: true }
		])
			expect(() => verifyDesktopEnvelope(signed(changes), cdn)).toThrow();
	});
	it('rejects noncanonical but validly signed JSON', () => {
		expect(() => verifyDesktopEnvelope(signed({}, false), cdn)).toThrow(/Noncanonical/);
	});
	it('fails closed when signing roots, publisher identity or feature flag are missing', () => {
		delete process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS;
		expect(() => verifyDesktopEnvelope(signed(), cdn)).toThrow(/not configured/);
		process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS = JSON.stringify({ 'ace-stable-v1': publicHex });
		delete process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256;
		expect(() => verifyDesktopEnvelope(signed(), cdn)).toThrow(/not configured/);
		process.env.ACE_DESKTOP_UPDATES_ENABLED = 'false';
		expect(() => verifyDesktopEnvelope(signed(), cdn)).toThrow(/disabled/);
	});
	it('compares stable SemVer by numeric components; no lexical downgrade', () => {
		expect(compareStableVersions('1.10.0', '1.9.0')).toBe(1);
		expect(compareStableVersions('1.9.0', '1.10.0')).toBe(-1);
		expect(compareStableVersions('2.0.0', '1.99.99')).toBe(1);
		expect(compareStableVersions('1.0.0', '1.0.0')).toBe(0);
		expect(() => compareStableVersions('1.0.0-beta', '1.0.0')).toThrow();
	});
});
