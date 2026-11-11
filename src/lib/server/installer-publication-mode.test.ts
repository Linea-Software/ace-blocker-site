import { describe, expect, it } from 'vitest';
import { canPublishUnsignedInstallers } from './installer-publication-mode';

describe('manual installer publication mode', () => {
	const localEnvironment = {
		NODE_ENV: 'development',
		DATABASE_URL: 'postgres://tester:password@127.0.0.1:5432/ace_dev'
	} as NodeJS.ProcessEnv;

	it('allows unsigned installer publication on a local development server', () => {
		expect(canPublishUnsignedInstallers(localEnvironment, true)).toBe(true);
	});

	it('refuses production builds regardless of NODE_ENV', () => {
		expect(canPublishUnsignedInstallers(localEnvironment, false)).toBe(false);
		expect(
			canPublishUnsignedInstallers({ ...localEnvironment, NODE_ENV: 'production' }, true)
		).toBe(false);
	});

	it('refuses remote databases, missing databases and test mode', () => {
		expect(
			canPublishUnsignedInstallers(
				{
					...localEnvironment,
					DATABASE_URL: 'postgres://admin:secret@db.example.com/prod'
				},
				true
			)
		).toBe(false);
		expect(canPublishUnsignedInstallers({ NODE_ENV: 'development' }, true)).toBe(false);
		expect(canPublishUnsignedInstallers({ ...localEnvironment, NODE_ENV: 'test' }, true)).toBe(
			false
		);
	});
});
