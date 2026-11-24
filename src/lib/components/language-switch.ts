import { localizeHref } from '$lib/paraglide/runtime';

export type AvailableSiteLocale = 'en' | 'it' | 'de' | 'es';

/** Reuse Paraglide's URL strategy and preserve query and fragment. */
export function languageSwitchHref(
	url: Pick<URL, 'pathname' | 'search' | 'hash'>,
	locale: AvailableSiteLocale
): string {
	const href = localizeHref(url.pathname + url.search + url.hash, { locale });
	return href.replace(/^\/(it|de|es)\/(?=[?#]|$)/, '/$1');
}
