/** Only same-site checkout and validated device-link return destinations. */
export function allowedAuthReturn(candidate: string | null): string | null {
	if (
		!candidate ||
		candidate.length > 2048 ||
		candidate.includes('\\') ||
		[...candidate].some((c) => c.charCodeAt(0) <= 32 || c.charCodeAt(0) === 127) ||
		!candidate.startsWith('/') ||
		candidate.startsWith('//')
	)
		return null;
	const url = new URL(candidate, 'https://return.invalid');
	if (url.origin !== 'https://return.invalid' || url.hash) return null;
	if (!/^\/(?:it\/|de\/|es\/)?(?:checkout|connect)$/.test(url.pathname)) return null;
	if (
		url.pathname.endsWith('/connect') &&
		url.search &&
		!/^\?code=[A-HJ-NP-Z2-9]{4}(?:-[A-HJ-NP-Z2-9]{4}){2}$/.test(url.search)
	)
		return null;
	return url.pathname + url.search;
}
