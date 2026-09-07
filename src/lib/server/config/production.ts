import { z } from 'zod';
import { isProduction } from '../../env';

const httpsUrl = z
	.string()
	.url()
	.refine((value) => new URL(value).protocol === 'https:', 'must use https:// in production');

const postgresUrl = z
	.string()
	.url()
	.refine(
		(value) => ['postgres:', 'postgresql:'].includes(new URL(value).protocol),
		'must use a postgres:// or postgresql:// URL'
	);

const betterAuthSecret = z
	.string()
	.min(32, 'must be at least 32 characters')
	.refine(
		(value) => !/^(change-me|changeme|secret|development|test)/i.test(value),
		'must not use a placeholder/default value'
	);

/** Production-only requirements. Tooling should use the permissive env schema instead. */
export const productionEnvSchema = z.object({
	NODE_ENV: z.literal('production'),
	DATABASE_URL: postgresUrl,
	BETTER_AUTH_SECRET: betterAuthSecret,
	BETTER_AUTH_URL: httpsUrl,
	ORIGIN: httpsUrl,
	PUBLIC_BETTER_AUTH_URL: httpsUrl,
	DODO_PAYMENTS_API_KEY: z.string().min(1),
	DODO_PAYMENTS_WEBHOOK_SECRET: z.string().min(1),
	RESEND_API_KEY: z.string().min(1),
	BUNNY_URL_TOKEN_AUTH_KEY: z.string().min(1),
	BUNNY_STORAGE_ZONE: z.string().min(1),
	BUNNY_CDN_BASE_URL: z.string().min(1),
	BUNNY_STORAGE_ACCESS_KEY: z.string().min(1)
});

export type ProductionEnvironment = z.infer<typeof productionEnvSchema>;

export function validateProductionEnvironment(
	environment: NodeJS.ProcessEnv = process.env
): ProductionEnvironment {
	return productionEnvSchema.parse(environment);
}

/**
 * A built production server must never silently run with development security
 * behavior because NODE_ENV was omitted or mistyped.
 */
export function assertProductionEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
	if (!isProduction(environment)) {
		throw new Error('Production runtime requires NODE_ENV=production');
	}
	validateProductionEnvironment(environment);
}
