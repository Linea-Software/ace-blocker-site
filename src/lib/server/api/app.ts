import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { v1Router } from './routers/v1';
import { auth } from '$lib/server/auth';
import { wrap } from '@bogeychan/elysia-logger';
import { logger } from '$lib/server/logger';
import { dev } from '$app/environment';

export const app = new Elysia({ prefix: '/api' })
	.use(wrap(logger))
	.mount(auth.handler)
	.use(v1Router);

if (dev) {
	app.use(
		openapi({
			path: '/docs',
			specPath: '/v1/openapi.json',
			documentation: {
				openapi: '3.0.3',
				info: {
					title: 'Ace Blocker API',
					version: '1.0.0'
				},
				components: {
					securitySchemes: {
						APIKeyHeader: {
							type: 'apiKey',
							in: 'header',
							name: 'x-api-key',
							description: 'Enter your API key here'
						}
					}
				},
				security: [
					{
						APIKeyHeader: []
					}
				]
			}
		})
	);
}

export type AppType = typeof app;
