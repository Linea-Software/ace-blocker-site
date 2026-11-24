import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const DATABASE_IMAGE = readFileSync(
	join(import.meta.dir, '../postgres-image.txt'),
	'utf8'
).trim();
const container = 'ace-blocker-db';
const volume = 'ace-blocker-pgdata-19';

function podman(args: string[], allowFailure = false) {
	const result = Bun.spawnSync(['podman', ...args], { stdout: 'pipe', stderr: 'pipe' });
	if (result.exitCode !== 0 && !allowFailure) {
		throw new Error(`Podman ${args[0]} failed: ${result.stderr.toString().trim()}`);
	}
	return result;
}

function exists(kind: 'container' | 'volume', name: string) {
	const result = podman([kind, 'exists', name], true);
	if (result.exitCode === 0) return true;
	if (result.exitCode === 1) return false;
	throw new Error(`Podman could not check ${kind} existence.`);
}

function requireLocalDatabase() {
	if (process.env.CONTAINER_HOST || process.env.CONTAINER_CONNECTION)
		throw new Error('Remote Podman connections are not allowed for the development database.');
	if (process.env.NODE_ENV === 'production')
		throw new Error('Development database commands are not allowed in production.');
	if (process.env.DATABASE_URL) {
		const url = new URL(process.env.DATABASE_URL);
		if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
			throw new Error('Development database commands require a local database.');
		}
	}
	if (
		podman(['info', '--format', '{{.Host.Security.Rootless}}']).stdout.toString().trim() !==
		'true'
	) {
		throw new Error('Development database requires rootless Podman.');
	}
}

export async function startDatabase() {
	requireLocalDatabase();
	for (const name of ['POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB']) {
		if (!process.env[name]) throw new Error(`Missing ${name}`);
	}
	if (exists('container', container)) {
		const image = podman(['inspect', '--format', '{{.ImageName}}', container])
			.stdout.toString()
			.trim();
		if (image !== DATABASE_IMAGE)
			throw new Error(
				'Existing development container uses a different image. Back up any needed data and remove it explicitly.'
			);
		podman(['start', container]);
	} else {
		podman(['volume', 'create', volume]);
		podman([
			'run',
			'-d',
			'--name',
			container,
			'--publish',
			'127.0.0.1:5432:5432',
			'--volume',
			volume + ':/var/lib/postgresql',
			'--env',
			'POSTGRES_USER',
			'--env',
			'POSTGRES_PASSWORD',
			'--env',
			'POSTGRES_DB',
			'--health-cmd',
			'pg_isready -h 127.0.0.1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"',
			'--health-interval',
			'2s',
			'--health-retries',
			'30',
			'--stop-timeout',
			'30',
			DATABASE_IMAGE
		]);
	}
	for (let i = 0; i < 60; i++) {
		if (podman(['healthcheck', 'run', container], true).exitCode === 0) {
			console.log('PostgreSQL is healthy.');
			return;
		}
		await Bun.sleep(1000);
	}
	throw new Error('PostgreSQL did not become healthy.');
}

export function deleteDatabase() {
	requireLocalDatabase();
	if (exists('container', container)) podman(['rm', '-f', container]);
	if (exists('volume', volume)) podman(['volume', 'rm', volume]);
	console.log('Development database removed.');
}

if (import.meta.main) {
	try {
		switch (process.argv[2]) {
			case 'start':
				await startDatabase();
				break;
			case 'delete':
				deleteDatabase();
				break;
			default:
				throw new Error('Usage: bun scripts/db.ts start|delete');
		}
	} catch (error) {
		console.error(error);
		process.exitCode = 1;
	}
}
