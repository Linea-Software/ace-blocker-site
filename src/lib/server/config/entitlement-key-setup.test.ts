import { afterEach, describe, expect, it } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
	ENTITLEMENT_PRIVATE_ENV,
	ENTITLEMENT_PUBLIC_ENV,
	ensureEntitlementKeyFiles,
	ensureEntitlementKeysInMap,
	ensureEntitlementKeysInText,
	verifyEntitlementKeyPair
} from '../../../../scripts/entitlement-key-setup';

const temporaryDirectories: string[] = [];
function temporaryDirectory(): string {
	const dir = mkdtempSync(join(tmpdir(), 'ace-entitlements-'));
	temporaryDirectories.push(dir);
	return dir;
}

afterEach(() => {
	for (const dir of temporaryDirectories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('entitlement key setup', () => {
	it('generates a valid Ed25519 pair outside checkout, with private file permissions 0600', () => {
		const dir = temporaryDirectory();
		const initial = ensureEntitlementKeyFiles(dir);
		expect(initial.source).toBe('generated');
		verifyEntitlementKeyPair(initial.pair);
		expect(Buffer.from(initial.pair.publicKey, 'base64')).toHaveLength(32);
		expect(readFileSync(join(dir, 'server-signing-private.b64'), 'utf8')).toBe(
			initial.pair.privateKey
		);
		expect(readFileSync(join(dir, 'desktop-verification-public.b64'), 'utf8')).toBe(
			initial.pair.publicKey
		);
		if (process.platform !== 'win32') {
			expect(statSync(join(dir, 'server-signing-private.b64')).mode & 0o777).toBe(0o600);
		}
		expect(readdirSync(dir)).toHaveLength(2);
		const repeated = ensureEntitlementKeyFiles(dir);
		expect(repeated).toEqual({ source: 'files', pair: initial.pair });
	});

	it('appends keys without changing pre-existing settings and keeps them stable on rerun', () => {
		const dir = temporaryDirectory();
		const original = '# Local settings\nFOO="keep"\n';
		const first = ensureEntitlementKeysInText(original, dir);
		expect(first.changed).toBe(true);
		expect(first.source).toBe('generated');
		expect(first.content).toContain(original);
		expect(first.content).toMatch(/ACE_ENTITLEMENT_SIGNING_KEY_BASE64="[A-Za-z0-9+/=]+"/);
		expect(first.content).toMatch(/ACE_ENTITLEMENT_PUBLIC_KEY_BASE64="[A-Za-z0-9+/=]+"/);
		expect(ensureEntitlementKeysInText(first.content, dir)).toEqual({
			content: first.content,
			source: 'environment',
			changed: false
		});
	});

	it('replaces blank .env entries and recovers the same keys from files', () => {
		const dir = temporaryDirectory();
		const initial = ensureEntitlementKeysInText(
			'FOO=ok\nACE_ENTITLEMENT_SIGNING_KEY_BASE64=""\nACE_ENTITLEMENT_PUBLIC_KEY_BASE64=\n',
			dir
		);
		expect(initial.changed).toBe(true);
		expect(initial.content).toMatch(/ACE_ENTITLEMENT_SIGNING_KEY_BASE64="[A-Za-z0-9+/=]+"/);
		const restored = ensureEntitlementKeysInText('FOO=ok\n', dir);
		expect(restored.source).toBe('files');
		expect(restored.content).toContain(
			initial.content.match(/ACE_ENTITLEMENT_PUBLIC_KEY_BASE64="[^"]+"/)![0]
		);
	});

	it('fails closed on one key, a mismatched key or duplicate .env entries', () => {
		const dir = temporaryDirectory();
		const first = ensureEntitlementKeyFiles(dir).pair;
		const different = generateKeyPairSync('ed25519');
		const wrongPublic = different.publicKey
			.export({ type: 'spki', format: 'der' })
			.subarray(-32)
			.toString('base64');
		expect(() =>
			verifyEntitlementKeyPair({ privateKey: first.privateKey, publicKey: wrongPublic })
		).toThrow(/do not match/);
		expect(() =>
			ensureEntitlementKeysInText(
				ENTITLEMENT_PRIVATE_ENV + '="' + first.privateKey + '"\n',
				dir
			)
		).toThrow(/Only one/);
		expect(() =>
			ensureEntitlementKeysInText(
				ENTITLEMENT_PUBLIC_ENV + '=x\n' + ENTITLEMENT_PUBLIC_ENV + '=y\n',
				dir
			)
		).toThrow(/Duplicate/);
		const map = new Map([[ENTITLEMENT_PRIVATE_ENV, first.privateKey]]);
		expect(() => ensureEntitlementKeysInMap(map, dir)).toThrow(/Only one/);
		expect(map.has(ENTITLEMENT_PUBLIC_ENV)).toBe(false);
	});

	it('reuses the production pair from files when restoring a missing .env', () => {
		const dir = temporaryDirectory();
		const env = new Map<string, string>();
		const initial = ensureEntitlementKeysInMap(env, dir);
		expect(initial.source).toBe('generated');
		const again = new Map<string, string>();
		const restored = ensureEntitlementKeysInMap(again, dir);
		expect(restored.source).toBe('files');
		expect(again).toEqual(env);
		expect(ensureEntitlementKeysInMap(again, dir).source).toBe('environment');
	});

	it('refuses to overwrite a partially present pair', () => {
		const dir = temporaryDirectory();
		writeFileSync(join(dir, 'server-signing-private.b64'), 'existing');
		expect(() => ensureEntitlementKeyFiles(dir)).toThrow(/Incomplete/);
		expect(readFileSync(join(dir, 'server-signing-private.b64'), 'utf8')).toBe('existing');
	});
});
