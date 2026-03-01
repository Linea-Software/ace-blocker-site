import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { v1Router } from './routers/v1';
import { auth } from '$lib/server/auth';
import { dev } from '$app/environment';

export const app = new Elysia({ prefix: '/api' })
	.onBeforeHandle(async ({ request }) => {
		// Handle Better Auth endpoints manually if they match /api/auth/*
		const url = new URL(request.url);
		if (url.pathname.startsWith('/api/auth/')) {
			return auth.handler(request);
		}
	})
	.use(v1Router);

if (dev) {
	app.use(
		openapi({
			path: '/docs',
			specPath: '/v1/openapi.json',
			documentation: {
				info: {
					title: 'Ace Blocker API',
					version: '1.0.0'
				},
				components: {
					securitySchemes: {
						APIKeyHeader: {
							type: 'apiKey',
							in: 'header',
							name: 'x-api-key'
						}
					}
				}
			}
		})
	);
}

export type AppType = typeof app;
