import { describe, expect, it } from 'vitest';
import {
	assertLocalDevelopmentDatabase,
	DEFAULT_DEVELOPMENT_ADMIN,
	resolveDevelopmentAdmin
} from './dev-admin';

const localEnv = {
	NODE_ENV: 'development',
	DATABASE_URL: 'postgresql://postgres:secret@localhost:5432/aceblocker'
};

describe('local-only development administrator settings', () => {
	it('uses the documented admin credentials when not configured', () => {
		expect(resolveDevelopmentAdmin({})).toEqual(DEFAULT_DEVELOPMENT_ADMIN);
		expect(
			resolveDevelopmentAdmin({
				DEFAULT_ADMIN_EMAIL: ' ',
				DEFAULT_ADMIN_USERNAME: '',
				DEFAULT_ADMIN_PASSWORD: ''
			})
		).toEqual(DEFAULT_DEVELOPMENT_ADMIN);
	});

	it('preserves custom credentials and normalizes the email', () => {
		expect(
			resolveDevelopmentAdmin({
				DEFAULT_ADMIN_EMAIL: ' Admin@Example.com ',
				DEFAULT_ADMIN_USERNAME: '  Local Admin  ',
				DEFAULT_ADMIN_PASSWORD: 'unique-password-2026'
			})
		).toEqual({
			email: 'admin@example.com',
			username: 'Local Admin',
			password: 'unique-password-2026'
		});
	});

	it('rejects known or too-short passwords for custom admins', () => {
		expect(() => resolveDevelopmentAdmin({ DEFAULT_ADMIN_EMAIL: 'real@example.com' })).toThrow(
			/custom DEFAULT_ADMIN_PASSWORD/
		);
		expect(() =>
			resolveDevelopmentAdmin({
				DEFAULT_ADMIN_EMAIL: 'real@example.com',
				DEFAULT_ADMIN_PASSWORD: 'dev-password'
			})
		).toThrow(/custom DEFAULT_ADMIN_PASSWORD/);
		expect(() => resolveDevelopmentAdmin({ DEFAULT_ADMIN_PASSWORD: 'abc' })).toThrow(
			/at least 12/
		);
	});

	it('allows loopback PostgreSQL hosts for local development', () => {
		for (const host of ['localhost', '127.0.0.1', '[::1]']) {
			expect(() =>
				assertLocalDevelopmentDatabase({
					...localEnv,
					DATABASE_URL: `postgresql://postgres:secret@${host}:5432/aceblocker`
				})
			).not.toThrow();
		}
	});

	it('fails closed for remote, malformed or non-PostgreSQL URLs and for production mode', () => {
		for (const url of [
			undefined,
			'not-a-url',
			'postgresql://postgres@db.internal:5432/aceblocker',
			'postgresql://postgres@localhost.evil.test:5432/aceblocker',
			'postgresql://postgres@192.168.1.10:5432/aceblocker',
			'mysql://root@localhost:3306/aceblocker',
			'postgresql://postgres@localhost:5432'
		]) {
			expect(() =>
				assertLocalDevelopmentDatabase({ ...localEnv, DATABASE_URL: url })
			).toThrow(/\[ACE DEV SEED ERROR\]/);
		}
		expect(() =>
			assertLocalDevelopmentDatabase({ ...localEnv, NODE_ENV: 'production' })
		).toThrow(/NODE_ENV/);
	});
});
