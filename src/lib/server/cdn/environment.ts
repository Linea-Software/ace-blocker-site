import { isProduction } from '../../env';

/** CDN object prefix. Production writes at the root; non-production is isolated under dev/. */
export function getCdnEnvironmentPrefix(environment: NodeJS.ProcessEnv = process.env): string {
	return isProduction(environment) ? '' : 'dev/';
}
