import { parse } from 'dotenv';
import {
	assertLocalDevelopmentDatabase,
	DEFAULT_DEVELOPMENT_ADMIN,
	resolveDevelopmentAdmin
} from '../src/lib/server/config/dev-admin';

/**
 * Prepare local development admin credentials without overwriting any
 * non-empty values. Intended for bun run setup; safe to unit-test in memory.
 */
export function configureDevelopmentAdminEnv(content: string): {
	content: string;
	changed: boolean;
	email: string;
} {
	const environment = parse(content);
	assertLocalDevelopmentDatabase(environment);
	const { email } = resolveDevelopmentAdmin(environment);
	const newline = content.includes('\r\n') ? '\r\n' : '\n';
	let updated = content;
	let changed = false;

	for (const [key, value] of Object.entries({
		DEFAULT_ADMIN_EMAIL: DEFAULT_DEVELOPMENT_ADMIN.email,
		DEFAULT_ADMIN_USERNAME: DEFAULT_DEVELOPMENT_ADMIN.username,
		DEFAULT_ADMIN_PASSWORD: DEFAULT_DEVELOPMENT_ADMIN.password
	})) {
		if (environment[key]?.trim()) continue;
		const setting = `${key}="${value}"`;
		const definition = new RegExp(`^[ \\t]*(?:export[ \\t]+)?${key}[ \\t]*=[^\\r\\n]*`, 'gm');
		if (definition.test(updated)) {
			updated = updated.replace(definition, setting);
		} else {
			if (updated && !updated.endsWith('\n')) updated += newline;
			updated += `${setting}${newline}`;
		}
		changed = true;
	}

	return { content: updated, changed, email };
}
