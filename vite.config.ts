import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfigExport } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';

const config: UserConfigExport = async ({ mode }) => {
	const server: { https?: any } = {};

	if (mode === 'development') {
		try {
			const devcert = await import('devcert-sanscache');
			server.https = await devcert.default('localhost');
		} catch (e) {
			console.warn('⚠️  Failed to generate dev SSL certificate. Falling back to HTTP.', e);
		}
	}

	return {
		server,
		plugins: [
			tailwindcss(),
			sveltekit(),
			paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
		] as any,
		optimizeDeps: {
			disabled: "dev"
		},

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
	};
};

export default config;
