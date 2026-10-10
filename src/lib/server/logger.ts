import { createRequire } from 'node:module';
import pino from 'pino';

const require = createRequire(import.meta.url);

// Use process.env so Better Auth CLI (`auth generate`) can resolve this
// without needing SvelteKit's $app/environment alias.
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Root application logger.
 *
 * In development, logs are pretty-printed with colors via pino-pretty.
 * In production, logs are emitted as raw JSON to stdout (container/cloud-friendly).
 *
 * Sensitive fields are automatically redacted — never logged, even in nested objects.
 */
export const logger = pino({
	name: 'ace-blocker',
	level: isDev ? 'debug' : 'info',
	...(isDev && {
		transport: {
			target: require.resolve('pino-pretty'),
			options: {
				colorize: true,
				translateTime: 'HH:MM:ss',
				ignore: 'pid,hostname'
			}
		}
	}),
	redact: {
		paths: [
			'password',
			'token',
			'secret',
			'apiKey',
			'accessKey',
			'*.password',
			'*.token',
			'*.secret',
			'*.apiKey',
			'*.accessKey',
			'headers.authorization',
			'headers.cookie'
		],
		censor: '[REDACTED]'
	}
});

/**
 * Convenience: create a child logger bound to a specific component/context.
 *
 * Usage:
 *   import { createLogger } from '$lib/server/logger';
 *   const log = createLogger('cdn:upload');
 *   log.info({ file: name }, 'Uploading file');
 */
export function createLogger(component: string): pino.Logger {
	return logger.child({ component });
}
