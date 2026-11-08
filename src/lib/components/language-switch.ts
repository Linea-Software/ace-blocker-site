import { localizeHref } from '$lib/paraglide/runtime';

export type AvailableSiteLocale = 'en' | 'it' | 'de' | 'es';

/** Reuse Paraglide's URL strategy and preserve query and fragment. */
export function languageSwitchHref(
	url: Pick<URL, 'pathname' | 'search' | 'hash'>,
	locale: AvailableSiteLocale
): string {
	return localizeHref(url.pathname + url.search + url.hash, { locale });
}
