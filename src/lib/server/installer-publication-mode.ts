import { dev } from '$app/environment';
import { assertLocalDevelopmentDatabase } from '$lib/server/config/dev-admin';

/**
 * Unsigned/manual installer publication is permitted only by the development
 * server against a local PostgreSQL database. A production build never enables
 * this path, even if NODE_ENV is accidentally set to "development".
 */
export function canPublishUnsignedInstallers(
	environment: NodeJS.ProcessEnv = process.env,
	isDevelopmentBuild: boolean = dev
): boolean {
	if (!isDevelopmentBuild || environment.NODE_ENV !== 'development') return false;
	try {
		assertLocalDevelopmentDatabase(environment);
		return true;
	} catch {
		return false;
	}
}
