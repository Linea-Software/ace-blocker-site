import { describe, expect, it } from 'vitest';
import { assertDevelopmentEnvironment, requiredRuntimeEnvironmentKeys } from './development';

function configuredEnvironment(): NodeJS.ProcessEnv {
	return Object.fromEntries(
		requiredRuntimeEnvironmentKeys.map((name) => [name, `configured-${name}`])
	);
}

describe('development startup environment', () => {
	it('accepts configured environment keys without requiring production HTTPS or NODE_ENV', () => {
		expect(() => assertDevelopmentEnvironment(configuredEnvironment())).not.toThrow();
	});

	it('lists every missing or blank variable in a recognizable startup error', () => {
		const environment = configuredEnvironment();
		delete environment.RESEND_API_KEY;
		environment.BUNNY_STORAGE_ACCESS_KEY = '   ';
		expect(() => assertDevelopmentEnvironment(environment)).toThrow(
			/\[ACE ENV ERROR\] Development startup aborted/
		);
		try {
			assertDevelopmentEnvironment(environment);
			throw new Error('Expected development environment assertion to fail');
		} catch (error) {
			const message = (error as Error).message;
			expect(message).toContain('RESEND_API_KEY');
			expect(message).toContain('BUNNY_STORAGE_ACCESS_KEY');
			expect(message).not.toContain('configured-DATABASE_URL');
			expect(message).toContain('restart the server');
		}
	});

	it('covers database, authentication and external provider credentials', () => {
		for (const key of [
			'DATABASE_URL',
			'BETTER_AUTH_SECRET',
			'PUBLIC_BETTER_AUTH_URL',
			'DODO_PAYMENTS_API_KEY',
			'DODO_PAYMENTS_WEBHOOK_SECRET',
			'RESEND_API_KEY',
			'BUNNY_URL_TOKEN_AUTH_KEY',
			'BUNNY_STORAGE_ZONE',
			'BUNNY_CDN_BASE_URL',
			'BUNNY_STORAGE_ACCESS_KEY'
		]) {
			expect(requiredRuntimeEnvironmentKeys).toContain(key);
			const environment = configuredEnvironment();
			delete environment[key];
			expect(() => assertDevelopmentEnvironment(environment)).toThrow(key);
		}
	});

	it('does not require production-only URLs or optional release/admin credentials', () => {
		expect(requiredRuntimeEnvironmentKeys).not.toContain('BETTER_AUTH_URL');
		expect(requiredRuntimeEnvironmentKeys).not.toContain('ORIGIN');
		expect(requiredRuntimeEnvironmentKeys).not.toContain('ACE_RELEASE_INGEST_TOKEN');
		expect(requiredRuntimeEnvironmentKeys).not.toContain('DEFAULT_ADMIN_PASSWORD');
		expect(() => assertDevelopmentEnvironment(configuredEnvironment())).not.toThrow();
	});
});
