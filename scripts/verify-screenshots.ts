/**
 * DEV-ONLY visual-verification helper: captures before/after full-page
 * screenshots (light + dark) of the pages affected by UI refactors, so a
 * refactor can be proven pixel-identical (compare files with a hash or a
 * pixel diff) before merging.
 *
 * Usage (from ace-blocker-site, dev server + Docker DB running):
 *   BASE_URL=http://localhost:5173 OUT_DIR=C:/tmp/shots/before bun scripts/verify-screenshots.ts
 *
 * Captures public pages logged OUT, then signs in as the dev admin
 * (2FA TOTP computed from the encrypted DB secret) and captures the admin
 * release pages. The 2FA helpers mirror Better Auth internals; if a Better
 * Auth upgrade changes the secret format, update decrypt2faSecret/totp.
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createOTP } from '@better-auth/utils/otp';
import { xchacha20poly1305 } from '@noble/ciphers/chacha.js';
import { hexToBytes, managedNonce } from '@noble/ciphers/utils.js';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5174';
const OUT_DIR = process.env.OUT_DIR ?? '.verify-shots';
fs.mkdirSync(OUT_DIR, { recursive: true });

// ── .env loader ────────────────────────────────────────────────────────────
function loadEnv(): Record<string, string> {
	const raw = fs.readFileSync(path.resolve(process.cwd(), '.env'), 'utf8');
	const out: Record<string, string> = {};
	for (const line of raw.split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
		if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
	}
	return out;
}

const env = loadEnv();

// ── 2FA secret handling ────────────────────────────────────────────────────
// Better Auth stores the TOTP secret encrypted with the auth secret:
// key = SHA-256(BETTER_AUTH_SECRET), xchacha20poly1305 with managed nonce.
function decrypt2faSecret(encryptedHex: string, authSecret: string): string {
	const key = createHash('sha256').update(authSecret, 'utf8').digest();
	const chacha = managedNonce(xchacha20poly1305)(new Uint8Array(key));
	const plain = chacha.decrypt(hexToBytes(encryptedHex));
	return new TextDecoder().decode(plain);
}

async function totp(secret: string): Promise<string> {
	return await createOTP(secret, { period: 30, digits: 6 }).totp();
}

function runDocker(args: string[]): string {
	const res = spawnSync('docker', args, { encoding: 'utf8', timeout: 30000 });
	if (res.status !== 0) throw new Error(res.stderr || `docker ${args[0]} failed`);
	return res.stdout.trim();
}

function admin2faSecret(): string | null {
	const sql = `select tf.secret from two_factor tf join "user" u on u.id = tf.user_id where u.email = '${env.DEFAULT_ADMIN_EMAIL}' limit 1;`;
	try {
		const encrypted = runDocker([
			'exec',
			'ace-blocker-db',
			'psql',
			'-U',
			env.POSTGRES_USER,
			'-d',
			env.POSTGRES_DB,
			'-t',
			'-A',
			'-c',
			sql
		]);
		if (!encrypted) return null;
		const authSecret = env.BETTER_AUTH_SECRET;
		if (!authSecret) throw new Error('BETTER_AUTH_SECRET missing from .env');
		return decrypt2faSecret(encrypted, authSecret);
	} catch (e) {
		console.warn('[verify] could not fetch/decrypt 2FA secret:', (e as Error).message);
		return null;
	}
}

// ── Pages to capture ───────────────────────────────────────────────────────
const PUBLIC_PAGES: Array<[string, string]> = [
	['get-pro', '/get-pro'],
	['download', '/download'],
	['signin', '/signin'],
	['signup', '/signup'],
	['about', '/about']
];

const ADMIN_PAGES: Array<[string, string]> = [
	['admin-releases-site-packs', '/admin/releases/site-packs'],
	['admin-releases-installers', '/admin/releases/installers'],
	['admin-releases-resistance', '/admin/releases/resistance']
];

async function shot(page: import('playwright').Page, label: string, dark: boolean) {
	await page.evaluate((d) => {
		const el = document.documentElement;
		if (d) el.classList.add('dark');
		else el.classList.remove('dark');
	}, dark);
	await page.waitForTimeout(1100); // settle mode-watcher transition + fonts
	const file = path.join(OUT_DIR, `${label}${dark ? '--dark' : '--light'}.png`);
	await page.screenshot({ path: file, fullPage: true });
	console.log('[verify] wrote', file);
}

async function capturePages(page: import('playwright').Page, pages: Array<[string, string]>) {
	for (const [label, url] of pages) {
		await page.goto(BASE_URL + url, { waitUntil: 'networkidle', timeout: 60000 });
		await page.waitForTimeout(700);
		await shot(page, label, false);
		await shot(page, label, true);
	}
}

async function adminSessionCookies(): Promise<Array<{ name: string; value: string; url: string }>> {
	const secret = admin2faSecret();
	if (!secret) throw new Error('Cannot obtain admin 2FA secret');

	// 1. Start the sign-in challenge (2FA required for the dev admin).
	const r1 = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: BASE_URL },
		body: JSON.stringify({ email: env.DEFAULT_ADMIN_EMAIL, password: env.DEFAULT_ADMIN_PASSWORD }),
		redirect: 'manual'
	});
	if (r1.status !== 200) throw new Error(`sign-in failed: ${r1.status} ${await r1.text()}`);
	const challengeCookies = (r1.headers.getSetCookie?.() ?? []).map((c: string) => c.split(';')[0]);
	const challengeHeader = challengeCookies.join('; ');

	// 2. Complete the TOTP challenge.
	const code = await totp(secret);
	const r2 = await fetch(`${BASE_URL}/api/auth/two-factor/verify-totp`, {
		method: 'POST',
		headers: { 'content-type': 'application/json', origin: BASE_URL, cookie: challengeHeader },
		body: JSON.stringify({ code }),
		redirect: 'manual'
	});
	if (r2.status !== 200) throw new Error(`verify-totp failed: ${r2.status} ${await r2.text()}`);

	// 3. Return the session cookies for injection into the browser context.
	return (r2.headers.getSetCookie?.() ?? [])
		.filter((c: string) => c.startsWith('better-auth.session_token='))
		.map((c: string) => {
			const [name, ...rest] = c.split(';')[0].split('=');
			return { name, value: rest.join('='), url: BASE_URL };
		});
}

async function signInAsAdmin(context: import('playwright').BrowserContext) {
	const cookies = await adminSessionCookies();
	if (cookies.length === 0) throw new Error('No session cookie returned by verify-totp');
	await context.addCookies(cookies);
	console.log('[verify] admin session cookie injected');
}

(async () => {
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
		const page = await context.newPage();

		console.log('[verify] capturing public pages (logged out)…');
		await capturePages(page, PUBLIC_PAGES);

		console.log('[verify] signing in as admin…');
		await signInAsAdmin(context);

		console.log('[verify] capturing admin release pages…');
		await capturePages(page, ADMIN_PAGES);

		console.log('[verify] done →', OUT_DIR);
	} finally {
		await browser.close();
	}
})().catch((e) => {
	console.error('[verify] FAILED:', e);
	process.exit(1);
});
