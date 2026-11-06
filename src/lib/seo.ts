/** Stable canonical URLs and their translated counterparts for public content. */
export const SITE_URL = 'https://aceblocker.com';
export const SEO_LOCALES = ['en', 'es', 'it', 'de'] as const;
export type SeoLocale = (typeof SEO_LOCALES)[number];

export const INDEXABLE_PATHS = [
	'/',
	'/about',
	'/faq',
	'/download',
	'/get-pro',
	'/privacy',
	'/terms'
] as const;

// FAQ is translated in all four locales. The other public pages are fully
// translated only in Italian; Spanish and German still fall back to English.
export function localesForPath(pathname: string): readonly SeoLocale[] {
	const path = basePath(pathname);
	if (path === '/faq') return SEO_LOCALES;
	return (INDEXABLE_PATHS as readonly string[]).includes(path)
		? ['en', 'it']
		: ['en'];
}

export function basePath(pathname: string): string {
	const path = pathname.replace(/^\/(?:es|it|de)(?=\/|$)/, '') || '/';
	return path.length > 1 ? path.replace(/\/$/, '') : path;
}

export function localeFromPath(pathname: string): SeoLocale {
	const match = pathname.match(/^\/(es|it|de)(?=\/|$)/);
	return (match?.[1] as SeoLocale | undefined) ?? 'en';
}

export function localizedPath(pathname: string, locale: SeoLocale): string {
	const path = basePath(pathname);
	return locale === 'en' ? path : `/${locale}${path === '/' ? '' : path}`;
}

export function canonicalUrl(pathname: string): string {
	return `${SITE_URL}${localizedPath(pathname, localeFromPath(pathname))}`;
}

export function isIndexablePage(pathname: string): boolean {
	return (
		(INDEXABLE_PATHS as readonly string[]).includes(basePath(pathname)) &&
		localesForPath(pathname).includes(localeFromPath(pathname))
	);
}

export function alternateUrls(pathname: string) {
	return localesForPath(pathname).map((locale) => ({
		locale,
		url: `${SITE_URL}${localizedPath(pathname, locale)}`
	}));
}
