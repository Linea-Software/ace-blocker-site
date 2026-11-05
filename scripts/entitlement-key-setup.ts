/** Idempotent Ed25519 entitlement keys for local setup and VPS. */
import {
	createPrivateKey,
	createPublicKey,
	generateKeyPairSync,
	timingSafeEqual
} from 'node:crypto';
import {
	chmodSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	writeFileSync
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENTITLEMENT_PRIVATE_ENV = 'ACE_ENTITLEMENT_SIGNING_KEY_BASE64';
export const ENTITLEMENT_PUBLIC_ENV = 'ACE_ENTITLEMENT_PUBLIC_KEY_BASE64';

type Pair = { privateKey: string; publicKey: string };
type Result = { source: 'environment' | 'files' | 'generated'; pair: Pair };

export function defaultEntitlementKeyDirectory(mode: 'development' | 'production'): string {
	return join(
		homedir(),
		'.config',
		'ace-blocker',
		mode === 'development' ? 'dev-entitlement-keys' : 'entitlement-keys'
	);
}

/** Reject malformed keys and mismatched pairs before trusting existing secrets. */
export function verifyEntitlementKeyPair(pair: Pair): void {
	const decode = (value: string) => {
		if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value))
			throw new Error('Invalid base64 entitlement key');
		const data = Buffer.from(value, 'base64');
		if (data.toString('base64') !== value)
			throw new Error('Non-canonical entitlement key encoding');
		return data;
	};
	const privateKey = createPrivateKey({
		key: decode(pair.privateKey),
		format: 'der',
		type: 'pkcs8'
	});
	if (privateKey.asymmetricKeyType !== 'ed25519')
		throw new Error('Entitlement private key must be Ed25519');
	const rawPublicKey = decode(pair.publicKey);
	if (rawPublicKey.length !== 32) throw new Error('Entitlement public key must be 32 bytes');
	const derived = createPublicKey(privateKey)
		.export({ type: 'spki', format: 'der' })
		.subarray(-32);
	if (!timingSafeEqual(derived, rawPublicKey))
		throw new Error('Entitlement signing/public keys do not match');
}

/** Store files outside checkout, keep existing pairs stable, and never silently rotate. */
export function ensureEntitlementKeyFiles(outputDir: string): Result {
	const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
	const requested = resolve(outputDir);
	if (requested === repository || requested.startsWith(repository + sep))
		throw new Error('Entitlement key files must be stored outside the source repository');
	mkdirSync(requested, { recursive: true, mode: 0o700 });
	const actual = realpathSync(requested);
	if (actual === repository || actual.startsWith(repository + sep))
		throw new Error('Entitlement key directory resolves inside the source repository');
	const privatePath = join(actual, 'server-signing-private.b64');
	const publicPath = join(actual, 'desktop-verification-public.b64');
	const hasPrivate = existsSync(privatePath);
	const hasPublic = existsSync(publicPath);
	if (hasPrivate !== hasPublic)
		throw new Error(
			'Incomplete entitlement key files: refusing to replace or rotate a partial pair'
		);
	if (hasPrivate) {
		const pair = {
			privateKey: readFileSync(privatePath, 'utf8').trim(),
			publicKey: readFileSync(publicPath, 'utf8').trim()
		};
		verifyEntitlementKeyPair(pair);
		return { pair, source: 'files' };
	}
	const { privateKey, publicKey } = generateKeyPairSync('ed25519');
	const pair = {
		privateKey: privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'),
		publicKey: publicKey
			.export({ type: 'spki', format: 'der' })
			.subarray(-32)
			.toString('base64')
	};
	verifyEntitlementKeyPair(pair);
	writeFileSync(privatePath, pair.privateKey, { flag: 'wx', mode: 0o600 });
	writeFileSync(publicPath, pair.publicKey, { flag: 'wx', mode: 0o600 });
	chmodSync(privatePath, 0o600);
	return { pair, source: 'generated' };
}

export function ensureEntitlementKeysInMap(env: Map<string, string>, keyDir: string): Result {
	const signing = (env.get(ENTITLEMENT_PRIVATE_ENV) || '').trim();
	const publicKey = (env.get(ENTITLEMENT_PUBLIC_ENV) || '').trim();
	if (signing && publicKey) {
		const pair = { privateKey: signing, publicKey };
		verifyEntitlementKeyPair(pair);
		return { pair, source: 'environment' };
	}
	if (signing || publicKey)
		throw new Error(
			'Only one entitlement key is configured: add its matching pair; refusing automatic rotation'
		);
	const result = ensureEntitlementKeyFiles(keyDir);
	env.set(ENTITLEMENT_PRIVATE_ENV, result.pair.privateKey);
	env.set(ENTITLEMENT_PUBLIC_ENV, result.pair.publicKey);
	return result;
}

/** Preserve original .env comments/values, only replacing missing or blank definitions. */
export function ensureEntitlementKeysInText(
	content: string,
	keyDir: string
): {
	content: string;
	changed: boolean;
	source: Result['source'];
} {
	const keys = [ENTITLEMENT_PRIVATE_ENV, ENTITLEMENT_PUBLIC_ENV] as const;
	const found = new Map<string, { value: string; present: boolean }>();
	for (const key of keys) {
		const regex = new RegExp('^' + key + '\s*=\s*([^\r\n]*)$', 'gm');
		const matches = [...content.matchAll(regex)];
		if (matches.length > 1) throw new Error('Duplicate entitlement key definitions in .env');
		const raw = matches[0]?.[1].trim() ?? '';
		const value = raw.replace(/^(['"])(.*)\1$/, '$2').trim();
		found.set(key, { value, present: matches.length === 1 });
	}
	const env = new Map(keys.map((key) => [key, found.get(key)!.value]));
	const result = ensureEntitlementKeysInMap(env, keyDir);
	if (result.source === 'environment') return { content, changed: false, source: result.source };
	let updated = content;
	for (const key of keys) {
		const definition = key + '="' + env.get(key) + '"';
		if (found.get(key)!.present) {
			const regex = new RegExp('^' + key + '\s*=\s*[^\r\n]*$', 'm');
			updated = updated.replace(regex, definition);
		} else {
			if (updated && !updated.endsWith('\n')) updated += '\n';
			updated += definition + '\n';
		}
	}
	return { content: updated, changed: true, source: result.source };
}
