/** Return log-safe request location metadata without query strings or fragments. */
export function getSafeRequestPath(url: string): string {
	return new URL(url).pathname;
}
