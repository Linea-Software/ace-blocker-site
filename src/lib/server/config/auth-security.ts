import { isProduction } from '../../env';

export const AUTH_RATE_LIMIT_WINDOW_SECONDS = 5 * 60;
export const AUTH_RATE_LIMIT_MAX_REQUESTS = 50;

export function getAuthRateLimitConfig(environment: NodeJS.ProcessEnv = process.env) {
	return {
		enabled: isProduction(environment),
		window: AUTH_RATE_LIMIT_WINDOW_SECONDS,
		max: AUTH_RATE_LIMIT_MAX_REQUESTS
	};
}
