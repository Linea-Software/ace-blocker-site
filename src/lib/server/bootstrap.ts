import { seedDatabase, seedPrices } from '$lib/server/seeder';
import { initializeCache } from '$lib/server/cache';
import { logger } from '$lib/server/logger';
import { assertProductionEnvironment } from '$lib/server/config/production';
import { assertDevelopmentEnvironment } from '$lib/server/config/development';
import { assertLocalDevelopmentDatabase } from '$lib/server/config/dev-admin';
import { startAceHostsSitePackSync, syncAceHostsSitePacks } from '$lib/server/ace-hosts-site-packs';

// Called once before the first request, never during a build. In particular,
// development admin provisioning must NEVER run on a remote production DB.
let initialized: Promise<void> | undefined;
export function initializeSite(): Promise<void> {
	initialized ??= (async () => {
		const development = import.meta.env.DEV;
		if (development) {
			assertDevelopmentEnvironment();
			assertLocalDevelopmentDatabase();
		} else {
			assertProductionEnvironment();
		}
		logger.info('Initializing application...');
		await seedPrices();
		await seedDatabase();
		if (!development) {
			try {
				await syncAceHostsSitePacks();
			} catch (error) {
				logger.error({ err: error }, 'Initial ace-hosts site-pack synchronization failed');
			}
		}
		await initializeCache();
		if (!development) startAceHostsSitePackSync();
		logger.info('Application initialized');
	})().catch((error) => {
		initialized = undefined;
		throw error;
	});
	return initialized;
}
