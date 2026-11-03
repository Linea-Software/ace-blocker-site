import { productionEnvSchema } from './production.ts';

/**
 * Require the same application settings in development as in production,
 * apart from NODE_ENV (set by the runtime), production-only origin settings
 * and explicitly optional settings.
 *
 * Keep this check at runtime/startup rather than module import time: tests,
 * builds, migrations and configuration scripts must remain importable.
 */
const developmentExcludedKeys = new Set(['NODE_ENV', 'BETTER_AUTH_URL', 'ORIGIN']);

export const requiredRuntimeEnvironmentKeys = Object.entries(productionEnvSchema.shape)
	.filter(([name, schema]) => !developmentExcludedKeys.has(name) && !schema.isOptional())
	.map(([name]) => name);

export function assertDevelopmentEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
	const missing = requiredRuntimeEnvironmentKeys.filter((name) => !environment[name]?.trim());
	if (missing.length === 0) return;

	throw new Error(
		'[ACE ENV ERROR] Development startup aborted: missing or empty required environment variables:\n' +
			missing.map((name) => `  - ${name}`).join('\n') +
			'\nSet these values in .env (or your process environment) and restart the server.'
	);
}
