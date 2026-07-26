/**
 * Environment detection utility.
 *
 * Checks the {@code ENV_IS_PRODUCTION} environment variable.
 * Returns `true` only when the value is exactly the string `"true"`.
 * All other values (`"false"`, `undefined`, `"invalid"`, etc.) return `false`.
 */
export function isProduction(): boolean {
	return process.env.ENV_IS_PRODUCTION === 'true';
}

/** Convenience inverse of {@link isProduction}. */
export function isDev(): boolean {
	return !isProduction();
}
