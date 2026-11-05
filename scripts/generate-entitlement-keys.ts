/** CLI: provision development entitlement keys and populate .env without logging secrets. */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	defaultEntitlementKeyDirectory,
	ensureEntitlementKeyFiles,
	ensureEntitlementKeysInText
} from './entitlement-key-setup';

if (import.meta.main) {
	const args = process.argv.slice(2).filter((arg) => arg !== '--');
	if (args.length > 1) throw new Error('Usage: bun run gen:entitlement-keys [secure-output-dir]');
	if (args.length === 1) {
		// Preserve standalone generation for creating a pair on a trusted machine.
		const result = ensureEntitlementKeyFiles(args[0]);
		console.log(
			'Entitlement key files ' +
				(result.source === 'generated' ? 'generated' : 'reused') +
				' outside repository. No secrets printed.'
		);
	} else {
		const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
		const envPath = join(root, '.env');
		const template = join(root, '.env.example');
		const current = existsSync(envPath)
			? readFileSync(envPath, 'utf8')
			: readFileSync(template, 'utf8');
		const result = ensureEntitlementKeysInText(
			current,
			defaultEntitlementKeyDirectory('development')
		);
		if (result.changed || !existsSync(envPath))
			writeFileSync(envPath, result.content, { mode: 0o600 });
		if (process.platform !== 'win32') chmodSync(envPath, 0o600);
		console.log(
			'Development entitlement keys ' +
				(result.source === 'generated' ? 'generated' : 'reused') +
				' and .env configured. No secrets printed.'
		);
	}
}
