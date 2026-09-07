import { describe, expect, it } from 'vitest';
import { isProduction } from '../src/lib/env';
import { getAuthRateLimitConfig } from '../src/lib/server/config/auth-security';
import { getCdnEnvironmentPrefix } from '../src/lib/server/cdn/environment';
import {
	configureProductionEnvironment,
	formatEnv,
	parseEnv,
	validateConfiguredProductionEnvironment
} from './setup-env';

function configuredEnv() {
	return new Map<string, string>([
		['POSTGRES_USER', 'postgres'],
		['POSTGRES_PASSWORD', 'db-password'],
		['POSTGRES_DB', 'aceblocker'],
		['DODO_PAYMENTS_API_KEY', 'dodo-test-key'],
		['DODO_PAYMENTS_WEBHOOK_SECRET', 'dodo-webhook-secret'],
		['RESEND_API_KEY', 'resend-test-key'],
		['BUNNY_URL_TOKEN_AUTH_KEY', 'bunny-token-key'],
		['BUNNY_STORAGE_ZONE', 'aceblocker-storage'],
		['BUNNY_CDN_BASE_URL', 'cdn.aceblocker.com'],
		['BUNNY_STORAGE_ACCESS_KEY', 'bunny-storage-key']
	]);
}

describe('production environment generation', () => {
	it('activates production security and production CDN paths', () => {
		const map = configureProductionEnvironment(configuredEnv(), 'aceblocker.com');
		validateConfiguredProductionEnvironment(map);
		const generated = Object.fromEntries(map);

		expect(generated.NODE_ENV).toBe('production');
		expect(generated.BETTER_AUTH_URL).toBe('https://aceblocker.com');
		expect(generated.PUBLIC_BETTER_AUTH_URL).toBe('https://aceblocker.com');
		expect(generated.ORIGIN).toBe('https://aceblocker.com');
		expect(generated.BETTER_AUTH_SECRET).toHaveLength(64);
		expect(isProduction(generated)).toBe(true);
		expect(getAuthRateLimitConfig(generated).enabled).toBe(true);
		expect(getCdnEnvironmentPrefix(generated)).toBe('');
	});

	it('does not write bootstrap admin credentials into the application environment', () => {
		const output = formatEnv(configureProductionEnvironment(configuredEnv(), 'aceblocker.com'));
		expect(output).not.toContain('DEFAULT_ADMIN_PASSWORD');
		expect(output).not.toContain('BACKUP_PASSPHRASE');
	});

	it('round-trips generated production mode through the env parser', () => {
		const output = formatEnv(configureProductionEnvironment(configuredEnv(), 'aceblocker.com'));
		const parsed = Object.fromEntries(parseEnv(output));
		expect(isProduction(parsed)).toBe(true);
		expect(getCdnEnvironmentPrefix(parsed)).toBe('');
	});
});
