#!/usr/bin/env bun

/** Production .env configuration used by scripts/setup-vps.sh. */
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import { productionEnvSchema } from '../src/lib/server/config/production';

type EnvMap = Map<string, string>;
type FetchLike = typeof fetch;

export type CredentialValidationResult =
	| { status: 'valid'; message: string }
	| { status: 'invalid'; message: string }
	| { status: 'unavailable'; message: string };

const C = {
	bold: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	reset: '\x1b[0m'
};

const CREDENTIAL_TIMEOUT_MS = 10_000;

function info(msg: string) {
	console.log(`${C.blue}[INFO]${C.reset}    ${msg}`);
}
function ok(msg: string) {
	console.log(`${C.green}[OK]${C.reset}      ${msg}`);
}
function warn(msg: string) {
	console.log(`${C.yellow}[WARN]${C.reset}    ${msg}`);
}

function parseArgs() {
	const raw = process.argv.slice(2);
	let domain = '';
	let envFile = '';
	for (let i = 0; i < raw.length; i++) {
		if (raw[i] === '--domain' && i + 1 < raw.length) domain = raw[++i];
		if (raw[i] === '--env-file' && i + 1 < raw.length) envFile = raw[++i];
	}
	if (!domain) throw new Error('--domain is required');
	return { domain, envFile: envFile || resolve(process.cwd(), '.env') };
}

/** Parse a .env file without executing it as shell. */
export function parseEnv(content: string): EnvMap {
	const map = new Map<string, string>();
	for (const line of content.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) continue;
		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
		}
		map.set(key, value);
	}
	return map;
}

function escapeEnvValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function formatEnv(env: EnvMap): string {
	const sections = [
		['# ── Database ──', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL'],
		['# ── Core ──', 'BETTER_AUTH_URL', 'PUBLIC_BETTER_AUTH_URL', 'ORIGIN', 'NODE_ENV'],
		['# ── Auth ──', 'BETTER_AUTH_SECRET'],
		['# ── Dodo Payments ──', 'DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_SECRET'],
		['# ── Email (Resend) ──', 'RESEND_API_KEY'],
		[
			'# ── BunnyCDN ──',
			'BUNNY_URL_TOKEN_AUTH_KEY',
			'BUNNY_STORAGE_ZONE',
			'BUNNY_CDN_BASE_URL',
			'BUNNY_STORAGE_ACCESS_KEY'
		]
	];
	const lines: string[] = [];
	const written = new Set<string>();
	for (const [comment, ...keys] of sections) {
		lines.push('', comment);
		for (const key of keys) {
			if (!env.has(key)) continue;
			lines.push(`${key}="${escapeEnvValue(env.get(key)!)}"`);
			written.add(key);
		}
	}
	const remaining = [...env.keys()].filter((key) => !written.has(key));
	if (remaining.length) {
		lines.push('', '# ── Other ──');
		for (const key of remaining) lines.push(`${key}="${escapeEnvValue(env.get(key)!)}"`);
	}
	return lines.join('\n') + '\n';
}

export function deriveDatabaseUrl(env: EnvMap): void {
	const user = env.get('POSTGRES_USER') || 'postgres';
	const pass = encodeURIComponent(env.get('POSTGRES_PASSWORD') || '');
	const db = env.get('POSTGRES_DB') || 'aceblocker';
	env.set('DATABASE_URL', `postgresql://${user}:${pass}@localhost:5432/${db}`);
}

/** Apply every non-secret production value generated from the deployment domain. */
export function configureProductionEnvironment(env: EnvMap, domain: string): EnvMap {
	const origin = `https://${domain}`;
	env.set('NODE_ENV', 'production');
	env.set('BETTER_AUTH_URL', origin);
	env.set('PUBLIC_BETTER_AUTH_URL', origin);
	env.set('ORIGIN', origin);
	if (!env.get('BETTER_AUTH_SECRET'))
		env.set('BETTER_AUTH_SECRET', randomBytes(32).toString('hex'));
	deriveDatabaseUrl(env);
	return env;
}

export function validateConfiguredProductionEnvironment(env: EnvMap): void {
	if (!env.get('POSTGRES_PASSWORD')) throw new Error('POSTGRES_PASSWORD is required');
	productionEnvSchema.parse(Object.fromEntries(env));
}

function providerUnavailable(provider: string, error: unknown): CredentialValidationResult {
	const detail = error instanceof Error ? error.message : String(error);
	return {
		status: 'unavailable',
		message: `${provider} could not be reached to validate credentials: ${detail}`
	};
}

/**
 * Validate the same Dodo Payments API mode used by the application today.
 * This is a read-only request and never creates a payment.
 */
export async function validateDodoApiKey(
	apiKey: string,
	fetchImpl: FetchLike = fetch
): Promise<CredentialValidationResult> {
	try {
		const response = await fetchImpl('https://test.dodopayments.com/payments', {
			headers: { Authorization: `Bearer ${apiKey}` },
			signal: AbortSignal.timeout(CREDENTIAL_TIMEOUT_MS)
		});
		if (response.status === 401 || response.status === 403) {
			return { status: 'invalid', message: 'Dodo Payments rejected the API key.' };
		}
		if (response.ok) {
			return { status: 'valid', message: 'Dodo Payments API key verified in test mode.' };
		}
		return {
			status: 'unavailable',
			message: `Dodo Payments returned HTTP ${response.status} while validating the key.`
		};
	} catch (error) {
		return providerUnavailable('Dodo Payments', error);
	}
}

/**
 * Resend supports send-only API keys, so account-listing endpoints would reject
 * otherwise valid credentials. Submit an intentionally incomplete email instead:
 * an authenticated key reaches request validation (400/422) but no email can be sent.
 */
export async function validateResendApiKey(
	apiKey: string,
	fetchImpl: FetchLike = fetch
): Promise<CredentialValidationResult> {
	try {
		const response = await fetchImpl('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: '{}',
			signal: AbortSignal.timeout(CREDENTIAL_TIMEOUT_MS)
		});
		if (response.status === 401 || response.status === 403) {
			return { status: 'invalid', message: 'Resend rejected the API key.' };
		}
		if (response.ok || response.status === 400 || response.status === 422) {
			return { status: 'valid', message: 'Resend API key verified.' };
		}
		return {
			status: 'unavailable',
			message: `Resend returned HTTP ${response.status} while validating the key.`
		};
	} catch (error) {
		return providerUnavailable('Resend', error);
	}
}

/** Validate both the Bunny storage-zone name and its Storage API password. */
export async function validateBunnyStorageCredentials(
	storageZone: string,
	accessKey: string,
	fetchImpl: FetchLike = fetch
): Promise<CredentialValidationResult> {
	try {
		const response = await fetchImpl(
			`https://storage.bunnycdn.com/${encodeURIComponent(storageZone)}/`,
			{
				headers: { AccessKey: accessKey },
				signal: AbortSignal.timeout(CREDENTIAL_TIMEOUT_MS)
			}
		);
		if (response.status === 401 || response.status === 403 || response.status === 404) {
			return {
				status: 'invalid',
				message: 'Bunny rejected the storage zone/access-key combination.'
			};
		}
		if (response.ok) {
			return { status: 'valid', message: 'Bunny storage credentials verified.' };
		}
		return {
			status: 'unavailable',
			message: `Bunny returned HTTP ${response.status} while validating storage credentials.`
		};
	} catch (error) {
		return providerUnavailable('Bunny Storage', error);
	}
}

async function promptValue(
	rl: readline.Interface,
	label: string,
	defaultValue: string,
	secret: boolean
): Promise<string> {
	if (secret && defaultValue)
		console.log(`  ${C.yellow}${label}${C.reset} ${C.blue}[***** existing value]${C.reset}`);
	else console.log(`  ${C.yellow}${label}${C.reset}`);
	if (defaultValue)
		console.log(`  ${C.blue}[default: ${secret ? '*****' : defaultValue}]${C.reset}`);
	const answer = await rl.question('  > ');
	return answer.trim() || defaultValue;
}

async function promptRequiredValue(
	rl: readline.Interface,
	label: string,
	defaultValue: string,
	secret: boolean
): Promise<string> {
	let currentDefault = defaultValue;
	while (true) {
		const value = await promptValue(rl, label, currentDefault, secret);
		if (value) return value;
		warn(`${label.replace(/:$/, '')} is required.`);
		currentDefault = '';
	}
}

async function promptValidatedValue(
	rl: readline.Interface,
	label: string,
	defaultValue: string,
	validator: (value: string) => Promise<CredentialValidationResult>
): Promise<string> {
	let currentDefault = defaultValue;
	while (true) {
		const value = await promptRequiredValue(rl, label, currentDefault, true);
		info(`Validating ${label.replace(/:$/, '')}...`);
		const result = await validator(value);
		if (result.status === 'valid') {
			ok(result.message);
			return value;
		}
		if (result.status === 'invalid') {
			warn(`${result.message} Please enter it again.`);
			currentDefault = '';
			continue;
		}
		throw new Error(result.message);
	}
}

async function validateStoredProviderCredentials(env: EnvMap): Promise<Set<string>> {
	const invalid = new Set<string>();

	info('Checking stored third-party credentials before reusing them.');

	const dodo = await validateDodoApiKey(env.get('DODO_PAYMENTS_API_KEY') || '');
	if (dodo.status === 'unavailable') throw new Error(dodo.message);
	if (dodo.status === 'invalid') invalid.add('DODO_PAYMENTS_API_KEY');
	else ok(dodo.message);

	const resend = await validateResendApiKey(env.get('RESEND_API_KEY') || '');
	if (resend.status === 'unavailable') throw new Error(resend.message);
	if (resend.status === 'invalid') invalid.add('RESEND_API_KEY');
	else ok(resend.message);

	const bunny = await validateBunnyStorageCredentials(
		env.get('BUNNY_STORAGE_ZONE') || '',
		env.get('BUNNY_STORAGE_ACCESS_KEY') || ''
	);
	if (bunny.status === 'unavailable') throw new Error(bunny.message);
	if (bunny.status === 'invalid') {
		invalid.add('BUNNY_STORAGE_ZONE');
		invalid.add('BUNNY_STORAGE_ACCESS_KEY');
	} else {
		ok(bunny.message);
	}

	return invalid;
}

function isFullyConfigured(env: EnvMap): boolean {
	try {
		validateConfiguredProductionEnvironment(env);
		return true;
	} catch {
		return false;
	}
}

async function main() {
	const { domain, envFile } = parseArgs();
	console.log(`\n${C.bold}${C.blue}Configure Production Environment${C.reset}\n`);

	let env: EnvMap;
	try {
		env = parseEnv(await readFile(envFile, 'utf-8'));
	} catch {
		info('.env not found — starting from scratch.');
		env = new Map();
	}
	configureProductionEnvironment(env, domain);

	if (isFullyConfigured(env)) {
		const invalid = await validateStoredProviderCredentials(env);
		if (invalid.size === 0) {
			info('Production secrets are configured and provider credentials work.');
			const rl = readline.createInterface({ input, output });
			const answer = await rl.question(
				'  Press Enter to keep them, or type "edit" to change: '
			);
			rl.close();
			if (answer.trim().toLowerCase() !== 'edit') {
				await writeFile(envFile, formatEnv(env), 'utf-8');
				ok('Production values refreshed without rotating secrets.');
				return;
			}
		} else {
			for (const key of invalid) env.delete(key);
			warn(
				`Stored credentials failed validation (${[...invalid].join(', ')}). Re-enter the affected values below.`
			);
		}
	}

	const rl = readline.createInterface({ input, output });
	try {
		console.log(`  ${C.blue}Press Enter to keep an existing secret/value.${C.reset}\n`);

		env.set(
			'POSTGRES_USER',
			await promptRequiredValue(
				rl,
				'PostgreSQL user:',
				env.get('POSTGRES_USER') || 'postgres',
				false
			)
		);
		env.set(
			'POSTGRES_PASSWORD',
			await promptRequiredValue(
				rl,
				'PostgreSQL password:',
				env.get('POSTGRES_PASSWORD') || '',
				true
			)
		);
		env.set(
			'POSTGRES_DB',
			await promptRequiredValue(
				rl,
				'PostgreSQL database name:',
				env.get('POSTGRES_DB') || 'aceblocker',
				false
			)
		);
		deriveDatabaseUrl(env);

		env.set(
			'DODO_PAYMENTS_API_KEY',
			await promptValidatedValue(
				rl,
				'Dodo API key:',
				env.get('DODO_PAYMENTS_API_KEY') || '',
				validateDodoApiKey
			)
		);
		env.set(
			'DODO_PAYMENTS_WEBHOOK_SECRET',
			await promptRequiredValue(
				rl,
				'Dodo webhook secret:',
				env.get('DODO_PAYMENTS_WEBHOOK_SECRET') || '',
				true
			)
		);
		info('Dodo webhook secrets cannot be authenticated until Dodo sends a signed webhook.');

		env.set(
			'RESEND_API_KEY',
			await promptValidatedValue(
				rl,
				'Resend API key:',
				env.get('RESEND_API_KEY') || '',
				validateResendApiKey
			)
		);

		env.set(
			'BUNNY_URL_TOKEN_AUTH_KEY',
			await promptRequiredValue(
				rl,
				'Bunny URL token auth key:',
				env.get('BUNNY_URL_TOKEN_AUTH_KEY') || '',
				true
			)
		);
		info('Bunny URL-token signing keys have no safe standalone authentication endpoint.');

		let bunnyZone = env.get('BUNNY_STORAGE_ZONE') || 'aceblocker-storage';
		let bunnyAccessKey = env.get('BUNNY_STORAGE_ACCESS_KEY') || '';
		while (true) {
			bunnyZone = await promptRequiredValue(rl, 'Bunny storage zone:', bunnyZone, false);
			bunnyAccessKey = await promptRequiredValue(
				rl,
				'Bunny storage access key:',
				bunnyAccessKey,
				true
			);
			info('Validating Bunny storage credentials...');
			const result = await validateBunnyStorageCredentials(bunnyZone, bunnyAccessKey);
			if (result.status === 'valid') {
				ok(result.message);
				break;
			}
			if (result.status === 'invalid') {
				warn(`${result.message} Please enter both values again.`);
				bunnyZone = '';
				bunnyAccessKey = '';
				continue;
			}
			throw new Error(result.message);
		}
		env.set('BUNNY_STORAGE_ZONE', bunnyZone);
		env.set('BUNNY_STORAGE_ACCESS_KEY', bunnyAccessKey);

		env.set(
			'BUNNY_CDN_BASE_URL',
			await promptRequiredValue(
				rl,
				'Bunny CDN hostname:',
				env.get('BUNNY_CDN_BASE_URL') || 'cdn.aceblocker.com',
				false
			)
		);
	} finally {
		rl.close();
	}

	configureProductionEnvironment(env, domain);
	try {
		validateConfiguredProductionEnvironment(env);
	} catch (error) {
		warn(
			'Production configuration is incomplete or invalid; refusing to save a deployable config.'
		);
		throw error;
	}
	await writeFile(envFile, formatEnv(env), 'utf-8');
	ok(`Environment configured and saved to ${envFile}`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(
			`\n${C.red}[FATAL]${C.reset} ${error instanceof Error ? error.message : error}`
		);
		process.exit(1);
	});
}
