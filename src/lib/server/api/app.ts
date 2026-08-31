import { Elysia } from 'elysia';
import { openapi } from '@elysiajs/openapi';
import { v1Router } from './routers/v1';
import { auth } from '$lib/server/auth';
import { createLogger } from '$lib/server/logger';
import { dev } from '$app/environment';

const log = createLogger('api');

/**
 * Better Call / Better Auth errors carry a string status (e.g. "UNAUTHORIZED").
 * Elysia's default error handler passes it straight to `Response(..., {status})`,
 * which coerces the string to 200 — an invalid API key or expired session would
 * LOOK authorized. Map the string statuses to real HTTP codes instead.
 */
const BETTER_CALL_STATUS_TO_HTTP: Record<string, number> = {
	OK: 200,
	CREATED: 201,
	ACCEPTED: 202,
	NO_CONTENT: 204,
	MOVED_PERMANENTLY: 301,
	FOUND: 302,
	SEE_OTHER: 303,
	NOT_MODIFIED: 304,
	TEMPORARY_REDIRECT: 307,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	PAYMENT_REQUIRED: 402,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	NOT_ACCEPTABLE: 406,
	REQUEST_TIMEOUT: 408,
	CONFLICT: 409,
	GONE: 410,
	LENGTH_REQUIRED: 411,
	PRECONDITION_FAILED: 412,
	PAYLOAD_TOO_LARGE: 413,
	URI_TOO_LONG: 414,
	UNSUPPORTED_MEDIA_TYPE: 415,
	RANGE_NOT_SATISFIABLE: 416,
	EXPECTATION_FAILED: 417,
	IM_A_TEAPOT: 418,
	UNPROCESSABLE_ENTITY: 422,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	NOT_IMPLEMENTED: 501,
	BAD_GATEWAY: 502,
	SERVICE_UNAVAILABLE: 503,
	GATEWAY_TIMEOUT: 504
};

export const app = new Elysia({ prefix: '/api' })
	.onError(({ code, error, request, set }) => {
		log.error(
			{
				err:
					error instanceof Error ? { message: error.message, stack: error.stack } : error,
				statusCode: set.status,
				code,
				method: request.method,
				path: request.url
			},
			'API error'
		);

		if (typeof error === 'object' && error !== null) {
			const status = (error as { status?: unknown }).status;
			if (typeof status === 'string' && status in BETTER_CALL_STATUS_TO_HTTP) {
				return new Response(
					JSON.stringify({
						message: (error as { message?: string }).message ?? 'Request failed'
					}),
					{
						status: BETTER_CALL_STATUS_TO_HTTP[status],
						headers: { 'content-type': 'application/json' }
					}
				);
			}
		}
	})
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
