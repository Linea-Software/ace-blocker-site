import { defineConfig } from '@playwright/test';

/**
 * Public marketing demos require no account, billing provider or production credentials.
 * The development server is started through the normal Bun workflow when needed.
 * Keep the main Playwright config for the DB-backed production-preview E2E suite.
 */
export default defineConfig({
	testDir: '.',
	testMatch: ['marketing-features.spec.ts', 'navbar-preferences.spec.ts', 'device-link.spec.ts'],
	use: { baseURL: 'http://localhost:5173' },
	webServer: {
		command: 'bun run dev',
		url: 'http://localhost:5173/',
		reuseExistingServer: true,
		timeout: 60_000
	}
});
