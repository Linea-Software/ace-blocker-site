import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import solid from '@solidjs/vite-plugin';
import { fileRoutes } from 'filesystem-routing/vite';
import { routePathFromFile } from 'filesystem-routing';
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { loadEnv, type Plugin } from 'vite';
import { assertDevelopmentEnvironment } from './src/lib/server/config/development.ts';
import { playwright } from '@vitest/browser-playwright';

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

export default defineConfig(({ command, mode }) => {
	// Keep the live dev server's generated modules independent of Vitest and
	// production builds (which intentionally use a different message layout).
	const testing = mode === 'test' || Boolean(process.env.VITEST);
	const paraglideOutdir = testing
		? './.generated/paraglide-test'
		: command === 'build'
			? './.generated/paraglide-build'
			: './src/lib/paraglide';
	return {
		server:
			command === 'serve' && mode === 'development' && !process.env.VITEST
				? {
						host: 'localhost',
						port: 5173,
						strictPort: true,
						watch: { ignored: ['**/.generated/**', '**/file-routes.d.ts'] }
					}
				: undefined,
		publicDir: 'static',
		envDir: process.env.ACE_E2E_ISOLATED === '1' ? (false as const) : undefined,
		envPrefix: ['VITE_', 'PUBLIC_'],
		resolve: {
			alias: {
				'$lib/paraglide': fileURLToPath(new URL(paraglideOutdir, import.meta.url)),
				$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
			}
		},
		plugins: [
			requireDevelopmentEnvironment(),
			tailwindcss(),
			solid({
				ssr: true,
				serverFunctions: true,
				start: {
					middleware: './src/middleware.ts',
					nodeServer: { precompress: false }
				}
			}),
			fileRoutes({
				types: !testing && command === 'serve',
				httpMethods: true,
				// Only public pages and their HTTP endpoints are routes. Co-located
				// server loaders, dialogs, charts and browser test components must
				// never become publicly addressable URLs or client route chunks.
				toPath(routeFile) {
					if (process.env.NODE_ENV === 'production' && routeFile.startsWith('/dev/'))
						return undefined;
					const isPage =
						routeFile === '/admin' ||
						routeFile === '/checkout' ||
						/\/index$/.test(routeFile);
					const isHttpEndpoint = [
						'/api/device-link/start',
						'/api/device-link/poll',
						'/api/device-link/approve',
						'/download/[arch]',
						'/sitemap.xml'
					].includes(routeFile);
					return isPage || isHttpEndpoint ? routePathFromFile(routeFile) : undefined;
				}
			}),
			paraglideVitePlugin({
				project: './project.inlang',
				outdir: paraglideOutdir,
				outputStructure:
					command === 'build' && !testing ? 'message-modules' : 'locale-modules',
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
						maxWorkers: 1,
						browser: {
							enabled: true,
							provider: playwright(),
							instances: [{ browser: 'chromium' as const, headless: true }]
						},
						include: ['src/**/*.browser.{test,spec}.{js,ts,tsx}'],
						exclude: ['src/lib/server/**']
					}
				},
				{
					extends: './vite.config.ts',
					test: {
						name: 'server',
						environment: 'node',
						include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
						exclude: ['src/**/*.browser.{test,spec}.{js,ts,tsx}']
					}
				}
			]
		}
	};
});
