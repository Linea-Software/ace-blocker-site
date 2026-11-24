import { defineConfig } from '@playwright/test';
const baseURL = process.env.ACE_E2E_BASE_URL;
if (
	process.env.ACE_E2E_ISOLATED !== '1' ||
	!baseURL ||
	!/^https:\/\/127\.0\.0\.1:\d+$/.test(baseURL)
)
	throw new Error('Run bun run test:e2e to create the disposable local fixture');
export default defineConfig({
	testDir: 'e2e',
	outputDir: 'test-results/playwright',
	workers: 1,
	use: { baseURL, ignoreHTTPSErrors: true }
});
