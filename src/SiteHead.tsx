import { createEffect, For, onSettled, Show } from 'solid-js';
import { Head, Link, Meta } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import {
	alternateUrls,
	basePath,
	canonicalUrl,
	isIndexablePage,
	localeFromPath,
	SITE_URL
} from '$lib/seo';
import { jsonLdScript, organizationAndWebsiteData } from '$lib/structured-data';
import * as m from '$lib/paraglide/messages';

/**
 * Shared metadata for all site routes. The previous SvelteKit layout had
 * these declarations; the per-page <Head> scopes provide page-specific
 * title and description.
 */
export default function SiteHead() {
	const location = useLocation();
	const path = () => location.pathname;
	const socialPreview = SITE_URL + '/ace-social-preview.png';
	const locale = () => localeFromPath(path());
	const localeTag = () => ({ en: 'en_US', it: 'it_IT', es: 'es_ES', de: 'de_DE' })[locale()];

	// Keep the document bootstrap and hydrated theme resolution in sync.
	function applyTheme(pathname: string, search: string) {
		const checkoutTheme =
			basePath(pathname) === '/checkout' ? new URLSearchParams(search).get('theme') : null;
		let stored: string | null = null;
		try {
			stored = localStorage.getItem('mode');
		} catch {
			// Storage can be disabled; the cookie and system preference still work.
		}
		const requested =
			checkoutTheme === 'dark' || checkoutTheme === 'light'
				? checkoutTheme
				: stored === 'dark' || stored === 'light'
					? stored
					: (document.cookie.match(/(?:^|; )mode=(dark|light)(?:;|$)/)?.[1] ??
						(matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
		document.documentElement.classList.toggle('dark', requested === 'dark');
		document.documentElement.style.colorScheme = requested;
	}

	createEffect(
		() => [path(), location.search] as const,
		([pathname, search]) => applyTheme(pathname, search)
	);
	onSettled(() => {
		const media = matchMedia('(prefers-color-scheme: dark)');
		const update = () => applyTheme(window.location.pathname, window.location.search);
		media.addEventListener('change', update);
		window.addEventListener('storage', update);
		return () => {
			media.removeEventListener('change', update);
			window.removeEventListener('storage', update);
		};
	});

	return (
		<Head>
			<Show when={import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION}>
				<Meta
					name="google-site-verification"
					content={import.meta.env.PUBLIC_GOOGLE_SITE_VERIFICATION}
				/>
			</Show>
			<Show when={import.meta.env.PUBLIC_BING_SITE_VERIFICATION}>
				<Meta
					name="msvalidate.01"
					content={import.meta.env.PUBLIC_BING_SITE_VERIFICATION}
				/>
			</Show>
			<Meta property="og:site_name" content="Ace Blocker" />
			<Meta property="og:image" content={socialPreview} />
			<Meta property="og:image:width" content="1200" />
			<Meta property="og:image:height" content="630" />
			<Meta property="og:image:alt" content={m.site_og_image_alt()} />
			<Meta property="og:type" content="website" />
			<Meta property="og:locale" content={localeTag()} />
			<Meta name="twitter:card" content="summary_large_image" />
			<Meta name="twitter:image" content={socialPreview} />
			<Meta name="twitter:image:alt" content={m.site_og_image_alt()} />
			<Show
				when={isIndexablePage(path())}
				fallback={<Meta name="robots" content="noindex, nofollow" />}
			>
				<Link rel="canonical" href={canonicalUrl(path())} />
				<script
					type="application/ld+json"
					innerHTML={jsonLdScript(organizationAndWebsiteData()).replace(
						/^<script[^>]*>|<\/script>$/g,
						''
					)}
				/>
				<For each={alternateUrls(path())}>
					{(alternate) => (
						<Link rel="alternate" hreflang={alternate.locale} href={alternate.url} />
					)}
				</For>
				<Link rel="alternate" hreflang="x-default" href={SITE_URL + basePath(path())} />
			</Show>
		</Head>
	);
}
