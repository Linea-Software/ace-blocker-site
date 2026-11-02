import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
	compareBaseline,
	type BaselineSnapshot,
	type Catalog
} from '../../../../scripts/db-baseline-check';

const snapshot = JSON.parse(
	readFileSync('drizzle/meta/0000_snapshot.json', 'utf8')
) as BaselineSnapshot;

function catalogFromSnapshot(): Catalog {
	const catalog: Catalog = { tables: [], columns: [], constraints: [], indexes: [], enums: [] };
	for (const table of Object.values(snapshot.tables)) {
		catalog.tables.push(table.name);
		for (const [name, col] of Object.entries(table.columns)) {
			const type =
				col.type === 'integer' ? 'int4' : col.type === 'boolean' ? 'bool' : col.type;
			catalog.columns.push({
				table_name: table.name,
				column_name: name,
				udt_name: type,
				is_nullable: col.notNull ? 'NO' : 'YES',
				column_default: col.default == null ? null : String(col.default)
			});
		}
		for (const name of Object.keys(table.foreignKeys ?? {})) {
			catalog.constraints.push({ table_name: table.name, conname: name, contype: 'f' });
		}
		for (const name of Object.keys(table.uniqueConstraints ?? {})) {
			catalog.constraints.push({ table_name: table.name, conname: name, contype: 'u' });
			catalog.indexes.push({ tablename: table.name, indexname: name, indexdef: '' });
		}
		if (Object.values(table.columns).some((col) => col.primaryKey)) {
			catalog.constraints.push({
				table_name: table.name,
				conname: `${table.name}_pkey`,
				contype: 'p'
			});
			catalog.indexes.push({
				tablename: table.name,
				indexname: `${table.name}_pkey`,
				indexdef: ''
			});
		}
		for (const [name, index] of Object.entries(table.indexes ?? {})) {
			const columns = index.columns.map((col) => col.expression).join(', ');
			catalog.indexes.push({
				tablename: table.name,
				indexname: name,
				indexdef: `CREATE ${index.isUnique ? 'UNIQUE ' : ''}INDEX "${name}" ON public."${table.name}" USING ${index.method ?? 'btree'} (${columns})`
			});
		}
	}
	for (const expected of Object.values(snapshot.enums)) {
		for (const value of expected.values) catalog.enums.push({ name: expected.name, value });
	}
	return catalog;
}

describe('local Drizzle baseline schema guard', () => {
	it('accepts a database that exactly matches the committed baseline', () => {
		expect(compareBaseline(snapshot, catalogFromSnapshot())).toEqual({
			issues: [],
			hasLegacyIssuer: false
		});
	});

	it('recognizes only the known Better Auth legacy issuer column and index', () => {
		const catalog = catalogFromSnapshot();
		catalog.columns.push({
			table_name: 'account',
			column_name: 'issuer',
			udt_name: 'text',
			is_nullable: 'NO',
			column_default: null
		});
		catalog.indexes.push({
			tablename: 'account',
			indexname: 'account_issuer_accountId_uidx',
			indexdef:
				'CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON public.account USING btree (issuer, account_id)'
		});
		expect(compareBaseline(snapshot, catalog)).toEqual({ issues: [], hasLegacyIssuer: true });
	});

	it('rejects unknown columns and absent indexes', () => {
		const catalog = catalogFromSnapshot();
		catalog.columns.push({
			table_name: 'user',
			column_name: 'unknown',
			udt_name: 'text',
			is_nullable: 'YES',
			column_default: null
		});
		catalog.indexes = catalog.indexes.filter(
			(index) => index.indexname !== 'account_userId_idx'
		);
		expect(compareBaseline(snapshot, catalog).issues).toEqual([
			'Missing index account.account_userId_idx',
			'Unexpected column user.unknown'
		]);
	});

	it('rejects missing or changed column types and enums', () => {
		const catalog = catalogFromSnapshot();
		catalog.columns.find(
			(column) => column.table_name === 'user' && column.column_name === 'id'
		)!.udt_name = 'int4';
		catalog.enums = catalog.enums.filter((item) => item.value !== 'arm64');
		expect(compareBaseline(snapshot, catalog).issues).toEqual(
			expect.arrayContaining(['Column type differs: user.id', 'Enum differs: architecture'])
		);
	});

	it('rejects a legacy index with no issuer column', () => {
		const catalog = catalogFromSnapshot();
		catalog.indexes.push({
			tablename: 'account',
			indexname: 'account_issuer_accountId_uidx',
			indexdef:
				'CREATE UNIQUE INDEX "account_issuer_accountId_uidx" ON public.account USING btree (issuer, account_id)'
		});
		expect(compareBaseline(snapshot, catalog).issues).toContain(
			'Incomplete legacy account.issuer schema'
		);
	});
});
