// Run the actual production artifact against a disposable database and fake providers.
import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer as createHttpsServer } from 'node:https';
import { request as httpRequest, createServer } from 'node:http';
import postgres from 'postgres';
import { DATABASE_IMAGE } from '../db';

const folder = mkdtempSync(join(tmpdir(), 'ace-e2e-'));
const container = 'ace-e2e-' + randomBytes(6).toString('hex');
const password = randomBytes(24).toString('hex');
const baseEnv = {
	PATH: process.env.PATH!,
	HOME: process.env.HOME!,
	...(process.env.XDG_RUNTIME_DIR ? { XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR } : {}),
	ACE_E2E_ISOLATED: '1',
	DOTENV_CONFIG_PATH: '/dev/null',
	NODE_ENV: 'production'
};
function run(cmd: string[], env: Record<string, string> = baseEnv) {
	const result = Bun.spawnSync(cmd, { env, stdout: 'inherit', stderr: 'inherit' });
	if (result.exitCode !== 0) throw new Error(cmd[0] + ' failed: ' + result.exitCode);
}
function output(cmd: string[]) {
	const result = Bun.spawnSync(cmd, { env: baseEnv });
	if (result.exitCode !== 0) throw new Error(cmd[0] + ' failed');
	return result.stdout.toString().trim();
}
const key = join(folder, 'key.pem'),
	cert = join(folder, 'cert.pem');
let child: ReturnType<typeof Bun.spawn> | undefined;
let proxy: ReturnType<typeof createHttpsServer> | undefined;
let db: ReturnType<typeof postgres> | undefined;
let created = false;
try {
	run([
		'openssl',
		'req',
		'-x509',
		'-newkey',
		'rsa:2048',
		'-nodes',
		'-days',
		'1',
		'-subj',
		'/CN=localhost',
		'-addext',
		'subjectAltName=DNS:localhost,IP:127.0.0.1',
		'-keyout',
		key,
		'-out',
		cert
	]);
	run([
		'podman',
		'run',
		'-d',
		'--rm',
		'--name',
		container,
		'-p',
		'127.0.0.1::5432',
		'-e',
		'POSTGRES_USER=ace_e2e',
		'-e',
		'POSTGRES_PASSWORD=' + password,
		'-e',
		'POSTGRES_DB=ace_e2e',
		DATABASE_IMAGE
	]);
	created = true;
	const port = output(['podman', 'port', container, '5432/tcp']).split(':').at(-1);
	const database = 'postgresql://ace_e2e:' + password + '@127.0.0.1:' + port + '/ace_e2e';
	for (let i = 0; i < 60; i++) {
		if (
			Bun.spawnSync(
				[
					'podman',
					'exec',
					container,
					'pg_isready',
					'-h',
					'127.0.0.1',
					'-U',
					'ace_e2e',
					'-d',
					'ace_e2e'
				],
				{ env: baseEnv }
			).exitCode === 0
		)
			break;
		if (i === 59) throw new Error('Isolated PostgreSQL not ready');
		await Bun.sleep(500);
	}
	const freePort = createServer();
	await new Promise<void>((resolve) => freePort.listen(0, '127.0.0.1', resolve));
	const backendPort = (freePort.address() as { port: number }).port;
	await new Promise<void>((resolve) => freePort.close(() => resolve()));
	proxy = createHttpsServer({ key: readFileSync(key), cert: readFileSync(cert) }, (req, res) => {
		const upstream = httpRequest(
			{
				hostname: '127.0.0.1',
				port: backendPort,
				path: req.url,
				method: req.method,
				headers: req.headers
			},
			(response) => {
				res.writeHead(response.statusCode ?? 500, response.headers);
				response.pipe(res);
			}
		);
		upstream.on('error', () => {
			if (!res.headersSent) res.writeHead(503);
			res.end();
		});
		req.pipe(upstream);
	});
	await new Promise<void>((resolve) => proxy!.listen(0, '127.0.0.1', resolve));
	const origin = 'https://127.0.0.1:' + (proxy.address() as { port: number }).port;
	const { privateKey, publicKey } = generateKeyPairSync('ed25519');
	const env = {
		...baseEnv,
		DATABASE_URL: database,
		ORIGIN: origin,
		BETTER_AUTH_URL: origin,
		PUBLIC_BETTER_AUTH_URL: origin,
		BETTER_AUTH_SECRET: randomBytes(32).toString('hex'),
		DODO_PAYMENTS_API_KEY: 'fixture',
		DODO_PAYMENTS_WEBHOOK_SECRET: 'whsec_' + randomBytes(32).toString('base64'),
		ACE_ENTITLEMENT_SIGNING_KEY_BASE64: privateKey
			.export({ type: 'pkcs8', format: 'der' })
			.toString('base64'),
		ACE_ENTITLEMENT_PUBLIC_KEY_BASE64: publicKey
			.export({ type: 'spki', format: 'der' })
			.subarray(-32)
			.toString('base64'),
		RESEND_API_KEY: 're_fixture',
		BUNNY_URL_TOKEN_AUTH_KEY: 'fixture',
		BUNNY_STORAGE_ZONE: 'fixture',
		BUNNY_CDN_BASE_URL: 'cdn.fixture.invalid',
		BUNNY_STORAGE_ACCESS_KEY: 'fixture',
		PORT: String(backendPort),
		HOST: '127.0.0.1',
		ACE_E2E_BASE_URL: origin
	};
	run(['bun', '--no-env-file', 'node_modules/drizzle-kit/bin.cjs', 'migrate'], env);
	db = postgres(database);
	for (const [os, name] of [
		['windows', 'AceBlocker-1.0.0-windows-x64.msi'],
		['linux', 'AceBlocker-1.0.0-linux-x64.tar.gz']
	] as const) {
		await db`insert into ace_blocker_installer (id,file_name,version,os,architecture,download_url,sha256,size,artifact_validated_at) values (${'fixture-' + os},${name},'1.0.0',${os},'x64','https://cdn.fixture.invalid/fixture',${'a'.repeat(64)},12345678,now())`;
	}
	await db.end();
	db = undefined;
	run(['bun', '--no-env-file', 'run', 'build'], env);
	child = Bun.spawn(
		[
			'bun',
			'--no-env-file',
			'--preload',
			'./scripts/e2e/mock-providers.ts',
			'./dist/server/node.js'
		],
		{ env, stdout: 'inherit', stderr: 'inherit' }
	);
	let ready = false;
	for (let i = 0; i < 80; i++) {
		try {
			const r = await fetch(origin, { tls: { rejectUnauthorized: false } });
			if (r.ok) {
				ready = true;
				await r.text();
				break;
			}
		} catch {
			// Retry while the isolated server initializes.
		}
		if (child.exitCode !== null) throw new Error('Production artifact exited');
		await Bun.sleep(250);
	}
	if (!ready) throw new Error('Production artifact readiness failed');
	const playwright = Bun.spawn(
		[
			'bun',
			'--no-env-file',
			'node_modules/@playwright/test/cli.js',
			'test',
			...process.argv.slice(2)
		],
		{ env, stdout: 'inherit', stderr: 'inherit' }
	);
	const status = await playwright.exited;
	if (status !== 0) throw new Error('Playwright failed: ' + status);
} finally {
	child?.kill();
	if (child) await child.exited;
	if (proxy) {
		proxy.closeAllConnections();
		await new Promise<void>((resolve) => proxy!.close(() => resolve()));
	}
	if (db) await db.end();
	if (created) Bun.spawnSync(['podman', 'rm', '-f', container], { env: baseEnv });
	rmSync(folder, { recursive: true, force: true });
}
