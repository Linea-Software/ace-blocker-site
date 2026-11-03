import { describe, expect, it } from 'vitest';
import { parse } from 'dotenv';
import { configureDevelopmentAdminEnv } from '../../../../scripts/dev-admin-setup';

const local = 'DATABASE_URL="postgresql://postgres:secret@localhost:5432/aceblocker"\n';

describe('local development admin setup', () => {
	it('adds all admin defaults to a fresh local environment file', () => {
		const result = configureDevelopmentAdminEnv(local);
		expect(result.changed).toBe(true);
		expect(result.email).toBe('dev@example.com');
		expect(parse(result.content)).toMatchObject({
			DEFAULT_ADMIN_EMAIL: 'dev@example.com',
			DEFAULT_ADMIN_USERNAME: 'Admin',
			DEFAULT_ADMIN_PASSWORD: 'dev-password'
		});
		expect(configureDevelopmentAdminEnv(result.content)).toEqual({
			...result,
			changed: false
		});
	});

	it('replaces blank template values, preserving other settings', () => {
		const original =
			local +
			'DEFAULT_ADMIN_EMAIL=""\nDEFAULT_ADMIN_USERNAME="   "\nDEFAULT_ADMIN_PASSWORD=\nRESEND_API_KEY="existing"\n';
		const result = configureDevelopmentAdminEnv(original);
		expect(parse(result.content)).toMatchObject({
			DEFAULT_ADMIN_EMAIL: 'dev@example.com',
			DEFAULT_ADMIN_USERNAME: 'Admin',
			DEFAULT_ADMIN_PASSWORD: 'dev-password',
			RESEND_API_KEY: 'existing'
		});
		expect(result.content.match(/DEFAULT_ADMIN_PASSWORD=/g) ?? []).toHaveLength(1);
	});

	it('keeps Windows line endings when filling empty existing settings', () => {
		const original =
			'DATABASE_URL="postgresql://postgres@localhost:5432/aceblocker"\r\nDEFAULT_ADMIN_EMAIL=""\r\nDEFAULT_ADMIN_USERNAME=""\r\nDEFAULT_ADMIN_PASSWORD=""\r\n';
		const { content } = configureDevelopmentAdminEnv(original);
		expect(content.split('\r\n')).toHaveLength(5);
		expect(content.replace(/\r\n/g, '')).not.toContain('\n');
		expect(parse(content).DEFAULT_ADMIN_EMAIL).toBe('dev@example.com');
	});

	it('preserves configured custom admin credentials without exposing or rewriting them', () => {
		const original =
			local +
			'DEFAULT_ADMIN_EMAIL="ops@example.com"\nDEFAULT_ADMIN_PASSWORD="unique-long-password"\nDEFAULT_ADMIN_USERNAME="Ops"\n';
		const result = configureDevelopmentAdminEnv(original);
		expect(result.changed).toBe(false);
		expect(result.content).toBe(original);
		expect(result.email).toBe('ops@example.com');
	});

	it('requires a custom password for a custom admin email', () => {
		const content = local + 'DEFAULT_ADMIN_EMAIL="ops@example.com"\n';
		expect(() => configureDevelopmentAdminEnv(content)).toThrow(/DEFAULT_ADMIN_PASSWORD/);
	});

	it('rejects production or remote database targets before preparing known credentials', () => {
		expect(() =>
			configureDevelopmentAdminEnv('DATABASE_URL="postgresql://db.example.com/db"\n')
		).toThrow(/local PostgreSQL/);
		expect(() => configureDevelopmentAdminEnv(local + 'NODE_ENV="production"\n')).toThrow(
			/NODE_ENV/
		);
	});
});
