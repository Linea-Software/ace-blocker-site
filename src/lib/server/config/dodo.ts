import { isProduction } from '$lib/env';

/**
 * Creating a billing customer must not block local signups when Dodo is
 * unconfigured, offline, or has a rejected API key. Production retains its
 * existing automatic customer sync and strict credentials.
 */
export function shouldCreateDodoCustomerOnSignUp(
	environment: NodeJS.ProcessEnv = process.env
): boolean {
	return isProduction(environment);
}
