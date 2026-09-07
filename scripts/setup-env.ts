#!/usr/bin/env bun

/** Production .env configuration used by scripts/setup-vps.sh. */
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';
import { productionEnvSchema } from '../src/lib/server/config/production';

type EnvMap = Map<string, string>;

const C = {
	bold: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	reset: '\x1b[0m'
};

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
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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
	if (!env.get('BETTER_AUTH_SECRET')) env.set('BETTER_AUTH_SECRET', randomBytes(32).toString('hex'));
	deriveDatabaseUrl(env);
	return env;
}

export function validateConfiguredProductionEnvironment(env: EnvMap): void {
	if (!env.get('POSTGRES_PASSWORD')) throw new Error('POSTGRES_PASSWORD is required');
	productionEnvSchema.parse(Object.fromEntries(env));
}

async function promptValue(
	rl: readline.Interface,
	label: string,
	defaultValue: string,
	secret: boolean
): Promise<string> {
	if (secret && defaultValue) console.log(`  ${C.yellow}${label}${C.reset} ${C.blue}[***** existing value]${C.reset}`);
	else console.log(`  ${C.yellow}${label}${C.reset}`);
	if (defaultValue) console.log(`  ${C.blue}[default: ${secret ? '*****' : defaultValue}]${C.reset}`);
	const answer = await rl.question('  > ');
	return answer.trim() || defaultValue;
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
		info('Production secrets are already configured.');
		const rl = readline.createInterface({ input, output });
		const answer = await rl.question('  Press Enter to keep them, or type "edit" to change: ');
		rl.close();
		if (answer.trim().toLowerCase() !== 'edit') {
			await writeFile(envFile, formatEnv(env), 'utf-8');
			ok('Production values refreshed without rotating secrets.');
			return;
		}
	}

	const rl = readline.createInterface({ input, output });
	console.log(`  ${C.blue}Press Enter to keep an existing secret/value.${C.reset}\n`);

	env.set('POSTGRES_USER', await promptValue(rl, 'PostgreSQL user:', env.get('POSTGRES_USER') || 'postgres', false));
	env.set('POSTGRES_PASSWORD', await promptValue(rl, 'PostgreSQL password:', env.get('POSTGRES_PASSWORD') || '', true));
	env.set('POSTGRES_DB', await promptValue(rl, 'PostgreSQL database name:', env.get('POSTGRES_DB') || 'aceblocker', false));
	deriveDatabaseUrl(env);

	env.set('DODO_PAYMENTS_API_KEY', await promptValue(rl, 'Dodo API key:', env.get('DODO_PAYMENTS_API_KEY') || '', true));
	env.set('DODO_PAYMENTS_WEBHOOK_SECRET', await promptValue(rl, 'Dodo webhook secret:', env.get('DODO_PAYMENTS_WEBHOOK_SECRET') || '', true));
	env.set('RESEND_API_KEY', await promptValue(rl, 'Resend API key:', env.get('RESEND_API_KEY') || '', true));
	env.set('BUNNY_URL_TOKEN_AUTH_KEY', await promptValue(rl, 'Bunny URL token auth key:', env.get('BUNNY_URL_TOKEN_AUTH_KEY') || '', true));
	env.set('BUNNY_STORAGE_ZONE', await promptValue(rl, 'Bunny storage zone:', env.get('BUNNY_STORAGE_ZONE') || 'aceblocker-storage', false));
	env.set('BUNNY_CDN_BASE_URL', await promptValue(rl, 'Bunny CDN hostname:', env.get('BUNNY_CDN_BASE_URL') || 'cdn.aceblocker.com', false));
	env.set('BUNNY_STORAGE_ACCESS_KEY', await promptValue(rl, 'Bunny storage access key:', env.get('BUNNY_STORAGE_ACCESS_KEY') || '', true));
	rl.close();

	configureProductionEnvironment(env, domain);
	try {
		validateConfiguredProductionEnvironment(env);
	} catch (error) {
		warn('Production configuration is incomplete or invalid; refusing to save a deployable config.');
		throw error;
	}
	await writeFile(envFile, formatEnv(env), 'utf-8');
	ok(`Environment configured and saved to ${envFile}`);
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(`\n${C.red}[FATAL]${C.reset} ${error instanceof Error ? error.message : error}`);
		process.exit(1);
	});
}
