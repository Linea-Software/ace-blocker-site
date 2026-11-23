/**
 * Stop drizzle-kit migrate from replaying a newly regenerated 0000 CREATE
 * TABLE migration against an existing database with historic migration IDs.
 *
 * This is read-only. This clean baseline is intended for new, non-production
 * databases. It must never silently replay CREATE TABLE against older data.
 */
import postgres from 'postgres';
import { resolve } from 'node:path';
import { readMigrationFiles } from 'drizzle-orm/migrator';

async function main() {
	const url = process.env.DATABASE_URL;
	if (!url) throw new Error('DATABASE_URL is required for migrations');
	const migrations = readMigrationFiles({ migrationsFolder: resolve('drizzle') });
	if (!migrations.length) throw new Error('No migrations available to apply');

	const db = postgres(url, { max: 1, connect_timeout: 5 });
	try {
		const [registry] = await db`SELECT to_regclass('drizzle.__drizzle_migrations') AS name`;
		const tables = await db`
			SELECT tablename FROM pg_tables WHERE schemaname = 'public'
		`;
		if (!registry?.name) {
			if (tables.length) {
				throw new Error('Refusing initial migrations against existing unmanaged tables.');
			}
			console.log('Migration guard: fresh empty database.');
			return;
		}
		const applied = await db`
			SELECT hash, created_at FROM drizzle.__drizzle_migrations ORDER BY created_at
		`;
		if (!applied.length) {
			if (tables.length) {
				throw new Error('Migration history is empty but tables already exist.');
			}
			console.log('Migration guard: empty database with migration registry.');
			return;
		}
		const [baseline] = migrations;
		if (
			!applied.some(
				(entry) =>
					Number(entry.created_at) === baseline.folderMillis &&
					entry.hash === baseline.hash
			)
		) {
			throw new Error(
				'Database has older Drizzle migration history. Refusing to replay CREATE TABLE. ' +
					'The schema was regenerated for clean, non-production databases: ' +
					'prepare a new development database before applying migrations.'
			);
		}
		for (const entry of applied) {
			if (Number(entry.created_at) < baseline.folderMillis) continue;
			if (
				!migrations.some(
					(migration) =>
						migration.folderMillis === Number(entry.created_at) &&
						migration.hash === entry.hash
				)
			) {
				throw new Error(
					'Unknown or mismatched migration applied after the current baseline.'
				);
			}
		}
		console.log('Migration guard: registered baseline verified.');
	} finally {
		await db.end();
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
