import { describe, expect, it, vi } from 'vitest';
import { isProduction } from '../../env';
import { getAuthRateLimitConfig } from './auth-security';
import { getCdnEnvironmentPrefix } from '../cdn/environment';
import {
	configureProductionEnvironment,
	formatEnv,
	parseEnv,
	validateBunnyStorageCredentials,
	validateConfiguredProductionEnvironment,
	validateDodoApiKey,
	validateResendApiKey
} from '../../../../scripts/setup-env';

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

function fetchReturning(status: number) {
	return vi.fn(async () => new Response('', { status })) as unknown as typeof fetch;
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

describe('production credential probes', () => {
	it('accepts a Dodo key only when the read-only API request authenticates', async () => {
		const validFetch = fetchReturning(200);
		const invalidFetch = fetchReturning(401);

		expect(await validateDodoApiKey('good', validFetch)).toMatchObject({ status: 'valid' });
		expect(await validateDodoApiKey('bad', invalidFetch)).toMatchObject({ status: 'invalid' });
		expect(validFetch).toHaveBeenCalledWith(
			'https://test.dodopayments.com/payments',
			expect.objectContaining({
				headers: { Authorization: 'Bearer good' }
			})
		);
	});

	it('uses an intentionally invalid Resend send request so send-only keys can be verified safely', async () => {
		const acceptedFetch = fetchReturning(422);
		const rejectedFetch = fetchReturning(403);

		expect(await validateResendApiKey('good', acceptedFetch)).toMatchObject({
			status: 'valid'
		});
		expect(await validateResendApiKey('bad', rejectedFetch)).toMatchObject({
			status: 'invalid'
		});
		expect(acceptedFetch).toHaveBeenCalledWith(
			'https://api.resend.com/emails',
			expect.objectContaining({
				method: 'POST',
				headers: expect.objectContaining({ Authorization: 'Bearer good' }),
				body: '{}'
			})
		);
	});

	it('validates Bunny storage zone and access key together', async () => {
		const validFetch = fetchReturning(200);
		const invalidFetch = fetchReturning(404);

		expect(
			await validateBunnyStorageCredentials('aceblocker-storage', 'good', validFetch)
		).toMatchObject({ status: 'valid' });
		expect(
			await validateBunnyStorageCredentials('wrong-zone', 'bad', invalidFetch)
		).toMatchObject({ status: 'invalid' });
		expect(validFetch).toHaveBeenCalledWith(
			'https://storage.bunnycdn.com/aceblocker-storage/',
			expect.objectContaining({ headers: { AccessKey: 'good' } })
		);
	});

	it('does not blame credentials when a provider cannot be reached', async () => {
		const offlineFetch = vi.fn(async () => {
			throw new Error('network down');
		}) as unknown as typeof fetch;

		expect(await validateDodoApiKey('maybe-good', offlineFetch)).toMatchObject({
			status: 'unavailable'
		});
	});
});
