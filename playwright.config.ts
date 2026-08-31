import { defineConfig } from '@playwright/test';

export default defineConfig({
	// Bun-only repo — never npm.
	webServer: { command: 'bun run build && bun run preview', port: 4173 },
	testDir: 'e2e'
});
