/** Compare an existing local PostgreSQL catalog with the checked-in Drizzle baseline. */
export type BaselineTable = {
	name: string;
	columns: Record<
		string,
		{
			type: string;
			notNull: boolean;
			default?: string | number | boolean;
			primaryKey?: boolean;
		}
	>;
	indexes: Record<
		string,
		{ columns: { expression: string }[]; method?: string; isUnique?: boolean }
	>;
	foreignKeys: Record<string, unknown>;
	uniqueConstraints: Record<string, unknown>;
};
export type BaselineSnapshot = {
	tables: Record<string, BaselineTable>;
	enums: Record<string, { name: string; values: string[] }>;
};

export type Catalog = {
	tables: string[];
	columns: {
		table_name: string;
		column_name: string;
		udt_name: string;
		is_nullable: string;
		column_default: string | null;
	}[];
	constraints: { table_name: string; conname: string; contype: string }[];
	indexes: { tablename: string; indexname: string; indexdef: string }[];
	enums: { name: string; value: string }[];
};

/**
 * The 1.7.0-1.7.2 Better Auth account.issuer column is known legacy drift.
 * It is removed only after checking the account table is empty under lock.
 */
export function compareBaseline(snapshot: BaselineSnapshot, catalog: Catalog) {
	const issues: string[] = [];
	let hasLegacyIssuer = false;
	const tables = Object.values(snapshot.tables);
	const knownTables = new Set(tables.map((table) => table.name));
	for (const table of tables) {
		if (!catalog.tables.includes(table.name)) issues.push(`Missing table ${table.name}`);
	}
	for (const table of catalog.tables) {
		if (!knownTables.has(table)) issues.push(`Unexpected table ${table}`);
	}

	for (const table of tables) {
		const actualColumns = catalog.columns.filter((column) => column.table_name === table.name);
		for (const [name, expected] of Object.entries(table.columns)) {
			const actual = actualColumns.find((column) => column.column_name === name);
			if (!actual) {
				issues.push(`Missing column ${table.name}.${name}`);
				continue;
			}
			const type =
				actual.udt_name === 'int4'
					? 'integer'
					: actual.udt_name === 'bool'
						? 'boolean'
						: actual.udt_name === 'timestamp'
							? 'timestamp'
							: actual.udt_name;
			if (type !== expected.type) issues.push(`Column type differs: ${table.name}.${name}`);
			if ((actual.is_nullable === 'NO') !== Boolean(expected.notNull)) {
				issues.push(`Column nullability differs: ${table.name}.${name}`);
			}
			const normalizeDefault = (value: unknown) =>
				String(value ?? '')
					.replace(/::(?:text|character varying|boolean|integer)/g, '')
					.replaceAll("'", '')
					.trim();
			if (normalizeDefault(actual.column_default) !== normalizeDefault(expected.default)) {
				issues.push(`Column default differs: ${table.name}.${name}`);
			}
		}
		for (const column of actualColumns) {
			if (column.column_name in table.columns) continue;
			if (
				table.name === 'account' &&
				column.column_name === 'issuer' &&
				column.udt_name === 'text' &&
				column.is_nullable === 'NO' &&
				column.column_default === null
			) {
				hasLegacyIssuer = true;
			} else {
				issues.push(`Unexpected column ${table.name}.${column.column_name}`);
			}
		}

		const expectedConstraints = new Set([
			...Object.keys(table.foreignKeys ?? {}),
			...Object.keys(table.uniqueConstraints ?? {}),
			...(Object.values(table.columns).some((column) => column.primaryKey)
				? [`${table.name}_pkey`]
				: [])
		]);
		const existingConstraints = catalog.constraints
			.filter(
				(constraint) => constraint.table_name === table.name && constraint.contype !== 'n'
			)
			.map((constraint) => constraint.conname);
		for (const name of expectedConstraints) {
			if (!existingConstraints.includes(name))
				issues.push(`Missing constraint ${table.name}.${name}`);
		}
		for (const name of existingConstraints) {
			if (!expectedConstraints.has(name))
				issues.push(`Unexpected constraint ${table.name}.${name}`);
		}

		const expectedIndexes = new Set([
			...Object.keys(table.indexes ?? {}),
			...Object.keys(table.uniqueConstraints ?? {}),
			...(Object.values(table.columns).some((column) => column.primaryKey)
				? [`${table.name}_pkey`]
				: [])
		]);
		const actualIndexes = catalog.indexes.filter((index) => index.tablename === table.name);
		for (const name of expectedIndexes) {
			if (!actualIndexes.some((index) => index.indexname === name)) {
				issues.push(`Missing index ${table.name}.${name}`);
			}
		}
		for (const index of actualIndexes) {
			if (expectedIndexes.has(index.indexname)) {
				const expected = table.indexes?.[index.indexname];
				if (expected) {
					const actualDef = index.indexdef.toLowerCase().replaceAll('"', '');
					const cols = expected.columns
						.map((column) => column.expression.toLowerCase())
						.join(', ');
					if (
						!actualDef.includes(`(${cols})`) ||
						!actualDef.includes(`using ${expected.method ?? 'btree'}`) ||
						index.indexdef.startsWith('CREATE UNIQUE INDEX') !==
							Boolean(expected.isUnique)
					) {
						issues.push(`Index definition differs: ${table.name}.${index.indexname}`);
					}
				}
			} else if (!(
				table.name === 'account' &&
				index.indexname === 'account_issuer_accountId_uidx' &&
				/\(issuer, account_id\)/.test(index.indexdef)
			)) {
				issues.push(`Unexpected index ${table.name}.${index.indexname}`);
			}
		}
		if (table.name === 'account') {
			const legacyIndex = actualIndexes.some(
				(index) =>
					index.indexname === 'account_issuer_accountId_uidx' &&
					/\(issuer, account_id\)/.test(index.indexdef)
			);
			if (legacyIndex !== hasLegacyIssuer)
				issues.push('Incomplete legacy account.issuer schema');
		}
	}

	const actualEnums = new Map<string, string[]>();
	for (const item of catalog.enums) {
		actualEnums.set(item.name, [...(actualEnums.get(item.name) ?? []), item.value]);
	}
	for (const expected of Object.values(snapshot.enums)) {
		if (JSON.stringify(actualEnums.get(expected.name)) !== JSON.stringify(expected.values)) {
			issues.push(`Enum differs: ${expected.name}`);
		}
		actualEnums.delete(expected.name);
	}
	for (const name of actualEnums.keys()) issues.push(`Unexpected enum ${name}`);
	return { issues, hasLegacyIssuer };
}
