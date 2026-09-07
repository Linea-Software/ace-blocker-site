import { z } from 'zod';

/**
 * Tooling-safe schema for environment variables the app may read. Production
 * startup validation is intentionally separate in `$lib/server/config/production`
 * so tests, migrations, generators, and setup scripts do not need every secret.
 */
export const envSchema = z.object({
	NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
	DATABASE_URL: z.string().min(1).optional(),
	BETTER_AUTH_URL: z.string().min(1).optional(),
	ORIGIN: z.string().min(1).optional(),
	BETTER_AUTH_SECRET: z.string().min(1).optional(),
	DODO_PAYMENTS_API_KEY: z.string().min(1).optional(),
	DODO_PAYMENTS_WEBHOOK_SECRET: z.string().min(1).optional(),
	RESEND_API_KEY: z.string().min(1).optional(),
	BUNNY_URL_TOKEN_AUTH_KEY: z.string().min(1).optional(),
	BUNNY_STORAGE_ZONE: z.string().min(1).optional(),
	BUNNY_CDN_BASE_URL: z.string().min(1).optional(),
	BUNNY_STORAGE_ACCESS_KEY: z.string().min(1).optional(),
	PUBLIC_BETTER_AUTH_URL: z.string().min(1).optional()
});

/**
 * `NODE_ENV` is the single production-mode signal shared by the application,
 * Docker image, and VPS deployment tooling.
 */
export function isProduction(environment: NodeJS.ProcessEnv = process.env): boolean {
	return environment.NODE_ENV === 'production';
}

/** Convenience inverse of {@link isProduction}. */
export function isDev(environment: NodeJS.ProcessEnv = process.env): boolean {
	return !isProduction(environment);
}
