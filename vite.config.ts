import { paraglideVitePlugin } from '@inlang/paraglide-js';
import tailwindcss from '@tailwindcss/vite';
import type { UserConfigExport } from 'vite';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import devcert from 'devcert-sanscache';
import fs from 'node:fs';
import path from 'node:path';

const config: UserConfigExport = async ({ mode }) => {
	const server: { https?: any } = {};

	if (mode === 'development') {
		const certPath = path.resolve('.cert/localhost.json');
		try {
			if (fs.existsSync(certPath)) {
				const cached = JSON.parse(fs.readFileSync(certPath, 'utf-8'));
				server.https = {
					key: Buffer.from(cached.key),
					cert: Buffer.from(cached.cert)
				};
			} else {
				const certificate = await devcert('localhost');
				server.https = certificate;
				if (!fs.existsSync(path.dirname(certPath))) {
					fs.mkdirSync(path.dirname(certPath), { recursive: true });
				}
				fs.writeFileSync(
					certPath,
					JSON.stringify({
						key: certificate.key.toString(),
						cert: certificate.cert.toString()
					})
				);
			}
		} catch (e) {
			console.warn('⚠️  Failed to generate or load dev SSL certificate. Falling back to HTTP.', e);
		}
	}

	return {
		server,
		plugins: [
			tailwindcss(),
			sveltekit(),
			paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
		] as any,
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
