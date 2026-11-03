import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { loadEnv, type Plugin } from 'vite';
import { assertDevelopmentEnvironment } from './src/lib/server/config/development.ts';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

// Run before Vite opens its development listening socket. Do not block
// test runners, builds, SvelteKit sync or module imports.
function requireDevelopmentEnvironment(): Plugin {
	return {
		name: 'ace-development-startup-env',
		apply: 'serve',
		configureServer(server) {
			if (process.env.VITEST) return;
			const loaded = loadEnv(server.config.mode, server.config.envDir, '');
			assertDevelopmentEnvironment({ ...process.env, ...loaded });
		}
	};
}

export default defineConfig({
	plugins: [
		requireDevelopmentEnvironment(),
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			strategy: ['url', 'baseLocale']
		})
	],

	test: {
		expect: { requireAssertions: true },

		projects: [
			{
				extends: './vite.config.ts',

				test: {
					name: 'client',

					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},

					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',

				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
