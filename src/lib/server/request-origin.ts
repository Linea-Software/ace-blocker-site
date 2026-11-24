/** Reconstruct the public request URL from deployment configuration, not forwarded headers. */
export function canonicalRequest(request: Request, configuredOrigin: string): Request | null {
	const origin = new URL(configuredOrigin);
	const incoming = new URL(request.url);
	if (
		origin.protocol !== 'https:' ||
		incoming.host !== origin.host ||
		origin.username ||
		origin.password ||
		origin.pathname !== '/' ||
		origin.search ||
		origin.hash
	)
		return null;
	if (incoming.origin === origin.origin) return request;
	const url = new URL(origin.origin);
	url.pathname = incoming.pathname;
	url.search = incoming.search;
	return new Request(url, request);
}
