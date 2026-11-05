import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

const output = process.argv[2];
if (!output) throw new Error('Usage: bun scripts/generate-entitlement-keys.ts <secure-output-dir>');
const repository = resolve(import.meta.dir, '..');
const dest = resolve(output);
if (dest === repository || dest.startsWith(repository + sep))
	throw new Error('Output must be outside the source repository');
mkdirSync(dest, { recursive: true, mode: 0o700 });
const actual = realpathSync(dest);
if (actual === repository || actual.startsWith(repository + sep))
	throw new Error('Output must resolve outside the repository');
const privatePath = join(actual, 'server-signing-private.b64');
const publicPath = join(actual, 'desktop-verification-public.b64');
if (existsSync(privatePath) || existsSync(publicPath))
	throw new Error('Refusing to overwrite an existing key pair');
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
writeFileSync(privatePath, privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64'), {
	flag: 'wx',
	mode: 0o600
});
writeFileSync(
	publicPath,
	publicKey.export({ type: 'spki', format: 'der' }).subarray(-32).toString('base64'),
	{ flag: 'wx', mode: 0o600 }
);
console.log(
	'Key pair created without printing private material. Keep the private file only in the server secret manager.'
);
