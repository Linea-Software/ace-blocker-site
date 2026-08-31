import { z } from 'zod';

/**
 * Zod schema for the environment variables the app reads — the single source
 * of truth for their names and shapes.
 *
 * Every entry is optional (or defaulted): modules that require a specific var
 * enforce their own presence checks (e.g. the CDN helpers and the DB
 * connection throw at import when their keys are missing), and the schema
 * must never fail at import time — tests and the Better Auth CLI run without
 * a full `.env`.
 */
export const envSchema = z.object({
	ENV_IS_PRODUCTION: z.enum(['true', 'false']).default('false'),
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
	DEFAULT_ADMIN_EMAIL: z.string().min(1).optional(),
	DEFAULT_ADMIN_USERNAME: z.string().min(1).optional(),
	DEFAULT_ADMIN_PASSWORD: z.string().min(1).optional(),
	PUBLIC_BETTER_AUTH_URL: z.string().min(1).optional()
});

/** Parsed env with defaults applied; never fails (all keys optional). */
const parsedEnv = envSchema.parse(process.env);

/**
 * Environment detection utility.
 *
 * Checks the {@code ENV_IS_PRODUCTION} environment variable.
 * Returns `true` only when the value is exactly the string `"true"`.
 * All other values (`"false"`, `undefined`, `"invalid"`, etc.) return `false`.
 */
export function isProduction(): boolean {
	return parsedEnv.ENV_IS_PRODUCTION === 'true';
}

/** Convenience inverse of {@link isProduction}. */
export function isDev(): boolean {
	return !isProduction();
}
