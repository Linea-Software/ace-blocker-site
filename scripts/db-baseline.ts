/**
 * Reconcile a legacy local development database with the rebased 0000 migration.
 * Never recreates the database or deletes existing rows. Fail closed if the
 * schema differs from the known baseline (except an empty legacy account.issuer).
 */
import { resolve } from 'node:path';
import postgres from 'postgres';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { compareBaseline, type BaselineSnapshot, type Catalog } from './db-baseline-check';

async function main() {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Database baseline reconciliation is only allowed in development.');
	}
	const connectionString = process.env.DATABASE_URL;
	if (!connectionString) throw new Error('DATABASE_URL is not configured.');
	const url = new URL(connectionString);
	if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
		throw new Error('Database baseline reconciliation requires a local database URL.');
	}

	const migrations = readMigrationFiles({ migrationsFolder: resolve('drizzle') });
	if (migrations.length !== 1) {
		// The reconciliation only applies to the one-time historical rebase.
		console.log('Database baseline reconciliation skipped: regular migration history.');
		return;
	}
	const [baseline] = migrations;
	const snapshot = (await Bun.file('drizzle/meta/0000_snapshot.json').json()) as BaselineSnapshot;
	const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
	try {
		await sql.begin(async (tx) => {
			await tx`SET LOCAL lock_timeout = '5s'`;
			// Prevent two concurrent setup commands from recording the same baseline.
			await tx`SELECT pg_advisory_xact_lock(78015821)`;
			const registry =
				await tx`SELECT to_regclass('drizzle.__drizzle_migrations') AS registry`;
			if (!registry[0]?.registry) {
				console.log('Fresh database: Drizzle will create the baseline normally.');
				return;
			}
			const applied =
				await tx`SELECT id, hash, created_at FROM drizzle.__drizzle_migrations ORDER BY id`;
			if (!applied.length) {
				throw new Error(
					'Migration registry exists but has no entries. Review the database manually.'
				);
			}
			if (applied.some((entry) => Number(entry.created_at) >= baseline.folderMillis)) {
				console.log('Database baseline already applied; continuing normal migrations.');
				return;
			}

			const db = await tx`SELECT current_database() AS name`;
			const databaseName = db[0]?.name;
			if (databaseName !== process.env.POSTGRES_DB) {
				throw new Error(
					'Existing migration history does not match the current baseline, and the selected database does not match POSTGRES_DB.'
				);
			}

			// Catalog validation must precede *any* schema changes. Postgres 18
			// represents NOT NULL constraints separately (contype = n).
			const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
			const columns = await tx`
        SELECT table_name, column_name, udt_name, is_nullable, column_default
        FROM information_schema.columns WHERE table_schema = 'public'`;
			const constraints = await tx`
        SELECT rel.relname AS table_name, c.conname, c.contype
        FROM pg_constraint c
        JOIN pg_class rel ON rel.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = rel.relnamespace
        WHERE n.nspname = 'public'`;
			const indexes = await tx`
        SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public'`;
			const enums = await tx`
        SELECT t.typname AS name, e.enumlabel AS value
        FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
        JOIN pg_enum e ON e.enumtypid = t.oid
        WHERE n.nspname = 'public' ORDER BY t.typname, e.enumsortorder`;
			const catalog: Catalog = {
				tables: tables.map((table) => table.tablename),
				columns: [...columns],
				constraints: [...constraints],
				indexes: [...indexes],
				enums: [...enums]
			};
			const { issues, hasLegacyIssuer } = compareBaseline(snapshot, catalog);
			if (issues.length) {
				throw new Error(
					`Local DB schema differs from the rebased baseline. No changes made:\n${issues.join('\n')}`
				);
			}

			if (process.argv.includes('--dry-run')) {
				console.log(
					'Dry run: local schema matches the rebased baseline.' +
						(hasLegacyIssuer
							? ' Empty account table is required to remove legacy issuer.'
							: '')
				);
				return;
			}

			if (hasLegacyIssuer) {
				// Acquire the lock before checking the row count, to avoid a concurrent
				// signup creating a new account before we remove the obsolete column.
				await tx`LOCK TABLE public.account IN ACCESS EXCLUSIVE MODE`;
				const [count] = await tx`SELECT count(*)::integer AS total FROM public.account`;
				if (count.total !== 0) {
					throw new Error(
						'Legacy account.issuer column detected with existing account rows. No changes made; manual migration review required.'
					);
				}
				// The old Better Auth 1.7.0-1.7.2 issuer column and its index are
				// obsolete with the locked dependency versions. Account is empty.
				await tx`ALTER TABLE public.account DROP COLUMN issuer`;
				console.log(
					'Removed unused legacy account.issuer column from empty account table.'
				);
			}

			// Preserve earlier migration records; record the exact checked-in
			// baseline hash & timestamp so subsequent drizzle-kit migrate calls do
			// not try to create already-existing tables and enums.
			await tx`
        INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
        VALUES (${baseline.hash}, ${baseline.folderMillis})`;
			console.log('Aligned existing local Drizzle history with the rebased baseline.');
		});
	} finally {
		await sql.end();
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}
