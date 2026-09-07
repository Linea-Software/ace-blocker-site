import { describe, expect, it } from 'vitest';
import { assertProductionEnvironment, validateProductionEnvironment } from './production';

function validEnv(): NodeJS.ProcessEnv {
	const placeholder = '[REDACTED_SECRET]';
	return {
		NODE_ENV: 'production',
		DATABASE_URL: 'postgresql://postgres@127.0.0.1:5432/aceblocker',
		BETTER_AUTH_SECRET: placeholder.repeat(3),
		BETTER_AUTH_URL: 'https://aceblocker.com',
		PUBLIC_BETTER_AUTH_URL: 'https://aceblocker.com',
		ORIGIN: 'https://aceblocker.com',
		DODO_PAYMENTS_API_KEY: placeholder,
		DODO_PAYMENTS_WEBHOOK_SECRET: placeholder,
		RESEND_API_KEY: placeholder,
		BUNNY_URL_TOKEN_AUTH_KEY: placeholder,
		BUNNY_STORAGE_ZONE: 'aceblocker-storage',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.com',
		BUNNY_STORAGE_ACCESS_KEY: placeholder
	};
}

describe('production runtime configuration', () => {
	it('accepts a complete HTTPS production environment', () => {
		expect(validateProductionEnvironment(validEnv()).NODE_ENV).toBe('production');
	});

	it('fails closed when a production-critical secret is missing', () => {
		const env = validEnv();
		delete env.DODO_PAYMENTS_WEBHOOK_SECRET;
		expect(() => validateProductionEnvironment(env)).toThrow();
	});

	it('rejects weak Better Auth secrets', () => {
		const env = validEnv();
		env.BETTER_AUTH_SECRET = 'change-me';
		expect(() => validateProductionEnvironment(env)).toThrow();
	});

	it('rejects insecure production auth origins', () => {
		const env = validEnv();
		env.BETTER_AUTH_URL = 'http://aceblocker.com';
		expect(() => validateProductionEnvironment(env)).toThrow(/https/);
	});

	it('rejects a built production runtime that omitted NODE_ENV', () => {
		const env = validEnv();
		delete env.NODE_ENV;
		expect(() => assertProductionEnvironment(env)).toThrow(/NODE_ENV=production/);
	});
});
