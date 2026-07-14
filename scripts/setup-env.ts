#!/usr/bin/env bun

/**
 * setup-env.ts — Interactive .env configuration for production deployment.
 *
 * Called by setup-vps.sh:
 *   bun scripts/setup-env.ts --domain example.com [--env-file /path/to/.env]
 *
 * Reads/writes .env using Bun's native file APIs — no shell escaping issues.
 */

import { readFile, writeFile } from 'node:fs/promises';
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { resolve } from 'node:path';

// ── Types ──────────────────────────────────────────────────────────────────

type EnvMap = Map<string, string>;

interface PromptConfig {
	key: string;
	prompt: string;
	default: string;
	secret?: boolean;
}

interface Section {
	label: string;
	prompts: PromptConfig[];
}

// ── CLI Argument Parsing ───────────────────────────────────────────────────

function parseArgs() {
	const raw = process.argv.slice(2);
	let domain = '';
	let envFile = '';
	for (let i = 0; i < raw.length; i++) {
		if (raw[i] === '--domain' && i + 1 < raw.length) domain = raw[++i];
		if (raw[i] === '--env-file' && i + 1 < raw.length) envFile = raw[++i];
	}
	if (!domain) {
		console.error('❌ --domain is required.');
		process.exit(1);
	}
	return { domain, envFile: envFile || resolve(process.cwd(), '.env') };
}

// ── .env Parsing & Writing ─────────────────────────────────────────────────

/** Parse a .env file into a Map, handling quoted and unquoted values. */
function parseEnv(content: string): { map: EnvMap; order: string[] } {
	const map = new Map<string, string>();
	const order: string[] = [];
	const lines = content.split('\n');
	for (const line of lines) {
		const trimmed = line.trim();
		// Skip comments and empty lines
		if (!trimmed || trimmed.startsWith('#')) {
			order.push(line);
			continue;
		}
		const eqIdx = trimmed.indexOf('=');
		if (eqIdx === -1) {
			order.push(line);
			continue;
		}
		const key = trimmed.slice(0, eqIdx).trim();
		let value = trimmed.slice(eqIdx + 1).trim();
		// Unwrap quotes
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
			// Unescape \" inside double-quoted values
			value = value.replace(/\\"/g, '"');
		}
		map.set(key, value);
		order.push(key); // we'll reconstruct later
	}
	return { map, order };
}

/** Write env map back to file, preserving non-key lines and comment structure. */
function formatEnv(env: EnvMap, extraLines: { key: string; comment?: string }[] = []): string {
	const lines: string[] = [];

	// Write known sections in order
	const sections = [
		['# ── Database ──', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB', 'DATABASE_URL'],
		['# ── Core ──', 'BETTER_AUTH_URL', 'ORIGIN', 'NODE_ENV'],
		['# ── Auth ──', 'BETTER_AUTH_SECRET'],
		['# ── Dodo Payments ──', 'DODO_PAYMENTS_API_KEY', 'DODO_PAYMENTS_WEBHOOK_SECRET', 'DODO_PAYMENTS_PRODUCTS'],
		['# ── Email (Resend) ──', 'RESEND_API_KEY'],
		['# ── BunnyCDN ──', 'BUNNY_URL_TOKEN_AUTH_KEY', 'BUNNY_STORAGE_ZONE', 'BUNNY_CDN_BASE_URL', 'BUNNY_STORAGE_ACCESS_KEY'],
		['# ── Default Admin ──', 'DEFAULT_ADMIN_EMAIL', 'DEFAULT_ADMIN_USERNAME', 'DEFAULT_ADMIN_PASSWORD'],
	];

	const written = new Set<string>();

	for (const section of sections) {
		const [comment, ...keys] = section;
		lines.push('');
		lines.push(comment);
		for (const key of keys) {
			if (env.has(key)) {
				const val = env.get(key)!;
				lines.push(`${key}="${escapeEnvValue(val)}"`);
				written.add(key);
			}
		}
	}

	// Write any remaining keys not in the sections above
	const remaining = [...env.keys()].filter(k => !written.has(k));
	if (remaining.length > 0) {
		lines.push('');
		lines.push('# ── Other ──');
		for (const key of remaining) {
			lines.push(`${key}="${escapeEnvValue(env.get(key)!)}"`);
		}
	}

	return lines.join('\n') + '\n';
}

/** Escape a value for safe inclusion in a double-quoted .env entry. */
function escapeEnvValue(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// ── Prompt Helpers ─────────────────────────────────────────────────────────

const C = {
	bold: '\x1b[1m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	reset: '\x1b[0m',
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

async function promptValue(rl: readline.Interface, label: string, defaultValue: string, secret: boolean): Promise<string> {
	if (secret && defaultValue) {
		console.log(`  ${C.yellow}${label}${C.reset} ${C.blue}[***** existing value]${C.reset}`);
	} else {
		console.log(`  ${C.yellow}${label}${C.reset}`);
	}

	if (defaultValue) {
		const display = secret ? '*****' : defaultValue;
		console.log(`  ${C.blue}[default: ${display}]${C.reset}`);
	}

	const answer = await rl.question('  > ');
	if (!answer.trim()) return defaultValue;
	return answer.trim();
}

// ── Required Values Validation ─────────────────────────────────────────────

const REQUIRED_KEYS = [
	'POSTGRES_PASSWORD',
	'DODO_PAYMENTS_API_KEY',
	'DODO_PAYMENTS_WEBHOOK_SECRET',
	'RESEND_API_KEY',
	'BUNNY_URL_TOKEN_AUTH_KEY',
	'BUNNY_STORAGE_ACCESS_KEY',
	'DEFAULT_ADMIN_PASSWORD',
];

const DEFAULTS_BY_KEY: Record<string, string> = {
	POSTGRES_USER: 'postgres',
	POSTGRES_DB: 'aceblocker',
	DODO_PAYMENTS_PRODUCTS: JSON.stringify([
		{ productId: 'pdt_0NXOnI40qSEVOqAnCUwmm', slug: 'ace_blocker_monthly' },
		{ productId: 'pdt_0NYXyjMDNixJ55IDOC42c', slug: 'ace_blocker_yearly' },
	]),
	BUNNY_STORAGE_ZONE: 'aceblocker-storage',
	BUNNY_CDN_BASE_URL: 'cdn.aceblocker.com',
	DEFAULT_ADMIN_EMAIL: 'admin@__DOMAIN__',
	DEFAULT_ADMIN_USERNAME: 'admin',
};

function isFullyConfigured(env: EnvMap): boolean {
	const checks = ['POSTGRES_PASSWORD', 'BETTER_AUTH_SECRET', 'DODO_PAYMENTS_API_KEY'];
	for (const key of checks) {
		if (!env.get(key)) return false;
	}
	return true;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
	const { domain, envFile } = parseArgs();

	console.log(`\n${C.bold}${C.blue}┌──────────────────────────────────────────────────────┐${C.reset}`);
	console.log(`${C.bold}${C.blue}│${C.reset}  Configure Environment Variables`);
	console.log(`${C.bold}${C.blue}└──────────────────────────────────────────────────────┘${C.reset}\n`);

	// Read existing .env
	let env: EnvMap;
	try {
		const raw = await readFile(envFile, 'utf-8');
		const parsed = parseEnv(raw);
		env = parsed.map;
	} catch {
		info('.env not found — starting from scratch.');
		env = new Map();
	}

	// ── Re-run detection ──
	if (isFullyConfigured(env)) {
		console.log(`  ${C.green}All required values are already configured.${C.reset}\n`);
		info(`BETTER_AUTH_URL: ${env.get('BETTER_AUTH_URL') || '(not set)'}`);
		info(`ORIGIN:          ${env.get('ORIGIN') || '(not set)'}`);
		info(`POSTGRES_USER:   ${env.get('POSTGRES_USER') || '(not set)'}`);
		info(`POSTGRES_DB:     ${env.get('POSTGRES_DB') || '(not set)'}\n`);

		const rl = readline.createInterface({ input, output });
		const answer = await rl.question('  Press Enter to keep these values, or type "edit" to change: ');
		rl.close();

		if (answer.trim().toLowerCase() !== 'edit') {
			// Just update derived values
			env.set('BETTER_AUTH_URL', `https://${domain}`);
			env.set('ORIGIN', `https://${domain}`);
			env.set('NODE_ENV', 'production');
			deriveDatabaseUrl(env);
			await writeFile(envFile, formatEnv(env), 'utf-8');
			ok('Core values updated. DATABASE_URL re-encoded.');
			printWarnings(env);
			return;
		}
	}

	// ── Interactive prompts ──
	const rl = readline.createInterface({ input, output });
	console.log(`  ${C.blue}Press Enter to accept defaults / skip optional values${C.reset}\n`);

	// ── Database ──
	console.log(`\n${C.bold}── Database ──${C.reset}`);
	env.set('POSTGRES_USER', await promptValue(rl, 'PostgreSQL user:', env.get('POSTGRES_USER') || DEFAULTS_BY_KEY.POSTGRES_USER, false));
	env.set('POSTGRES_PASSWORD', await promptValue(rl, 'PostgreSQL password:', env.get('POSTGRES_PASSWORD') || '', true));
	env.set('POSTGRES_DB', await promptValue(rl, 'PostgreSQL database name:', env.get('POSTGRES_DB') || DEFAULTS_BY_KEY.POSTGRES_DB, false));
	deriveDatabaseUrl(env);
	ok(`DATABASE_URL derived: postgresql://${env.get('POSTGRES_USER')}:*****@localhost:5432/${env.get('POSTGRES_DB')}`);

	// ── Core ──
	console.log(`\n${C.bold}── Core ──${C.reset}`);
	env.set('BETTER_AUTH_URL', `https://${domain}`);
	env.set('ORIGIN', `https://${domain}`);
	env.set('NODE_ENV', 'production');
	ok(`BETTER_AUTH_URL: https://${domain}`);
	ok(`ORIGIN:          https://${domain}`);

	// ── Dodo Payments ──
	console.log(`\n${C.bold}── Dodo Payments ──${C.reset}`);
	env.set('DODO_PAYMENTS_API_KEY', await promptValue(rl, 'API key:', env.get('DODO_PAYMENTS_API_KEY') || '', true));
	env.set('DODO_PAYMENTS_WEBHOOK_SECRET', await promptValue(rl, 'Webhook secret:', env.get('DODO_PAYMENTS_WEBHOOK_SECRET') || '', true));
	const productsDefault = env.get('DODO_PAYMENTS_PRODUCTS') || DEFAULTS_BY_KEY.DODO_PAYMENTS_PRODUCTS;
	env.set('DODO_PAYMENTS_PRODUCTS', await promptValue(rl, 'Products JSON:', productsDefault, false));

	// ── Email (Resend) ──
	console.log(`\n${C.bold}── Email (Resend) ──${C.reset}`);
	env.set('RESEND_API_KEY', await promptValue(rl, 'Resend API key:', env.get('RESEND_API_KEY') || '', true));

	// ── BunnyCDN ──
	console.log(`\n${C.bold}── BunnyCDN ──${C.reset}`);
	env.set('BUNNY_URL_TOKEN_AUTH_KEY', await promptValue(rl, 'URL token auth key:', env.get('BUNNY_URL_TOKEN_AUTH_KEY') || '', true));
	env.set('BUNNY_STORAGE_ZONE', await promptValue(rl, 'Storage zone name:', env.get('BUNNY_STORAGE_ZONE') || DEFAULTS_BY_KEY.BUNNY_STORAGE_ZONE, false));
	env.set('BUNNY_CDN_BASE_URL', await promptValue(rl, 'CDN base URL:', env.get('BUNNY_CDN_BASE_URL') || DEFAULTS_BY_KEY.BUNNY_CDN_BASE_URL, false));
	env.set('BUNNY_STORAGE_ACCESS_KEY', await promptValue(rl, 'Storage access key:', env.get('BUNNY_STORAGE_ACCESS_KEY') || '', true));

	// ── Default Admin ──
	console.log(`\n${C.bold}── Default Admin Account ──${C.reset}`);
	const adminEmailDefault = env.get('DEFAULT_ADMIN_EMAIL') || DEFAULTS_BY_KEY.DEFAULT_ADMIN_EMAIL.replace('__DOMAIN__', domain);
	env.set('DEFAULT_ADMIN_EMAIL', await promptValue(rl, 'Admin email:', adminEmailDefault, false));
	env.set('DEFAULT_ADMIN_USERNAME', await promptValue(rl, 'Admin username:', env.get('DEFAULT_ADMIN_USERNAME') || DEFAULTS_BY_KEY.DEFAULT_ADMIN_USERNAME, false));
	env.set('DEFAULT_ADMIN_PASSWORD', await promptValue(rl, 'Admin password:', env.get('DEFAULT_ADMIN_PASSWORD') || '', true));

	rl.close();

	// ── Write .env ──
	await writeFile(envFile, formatEnv(env), 'utf-8');
	console.log('');
	ok(`Environment configured and saved to ${envFile}`);

	printWarnings(env);
}

function deriveDatabaseUrl(env: EnvMap): void {
	const user = env.get('POSTGRES_USER') || 'postgres';
	const pass = encodeURIComponent(env.get('POSTGRES_PASSWORD') || '');
	const db = env.get('POSTGRES_DB') || 'aceblocker';
	env.set('DATABASE_URL', `postgresql://${user}:${pass}@localhost:5432/${db}`);
}

function printWarnings(env: EnvMap): void {
	const empty: string[] = [];
	for (const key of REQUIRED_KEYS) {
		if (!env.get(key)) empty.push(key);
	}
	if (empty.length > 0) {
		console.log('');
		for (const key of empty) {
			warn(`${key} is EMPTY — the app may not function without it.`);
		}
	}
}

main().catch(err => {
	console.error(`\n${C.red}[FATAL]${C.reset} ${err.message}`);
	process.exit(1);
});
