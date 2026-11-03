<script lang="ts">
	import '@fontsource/ibm-plex-sans/400.css';
	import '@fontsource/ibm-plex-sans/500.css';
	import '@fontsource/ibm-plex-sans/600.css';
	import '@fontsource/ibm-plex-sans-condensed/500.css';
	import '@fontsource/ibm-plex-sans-condensed/600.css';
	import '@fontsource/ibm-plex-sans-condensed/700.css';
	import '@fontsource/ibm-plex-mono/400.css';
	import '@fontsource/ibm-plex-mono/500.css';

	import { page } from '$app/state';
	import { env } from '$env/dynamic/public';
	import { jsonLdScript, organizationAndWebsiteData } from '$lib/structured-data';
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import {
		alternateUrls,
		basePath,
		canonicalUrl,
		isIndexablePage,
		localeFromPath,
		SITE_URL
	} from '$lib/seo';
	import { ModeWatcher } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
	import './layout.css';

	let { children } = $props();

	const defaultOgImage = $derived(new URL('/ace-social-preview.png', page.url.origin).href);
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="16x16" href="/ace-favicon-16.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/ace-favicon-32.png" />
	<link
		rel="icon"
		type="image/svg+xml"
		href="/ace-favicon.svg"
		media="(prefers-color-scheme: light)"
	/>
	<link
		rel="icon"
		type="image/svg+xml"
		href="/ace-favicon-dark.svg"
		media="(prefers-color-scheme: dark)"
	/>
	<link rel="apple-touch-icon" sizes="180x180" href="/ace-apple-touch-icon.png" />

	{#if env.PUBLIC_GOOGLE_SITE_VERIFICATION}
		<meta name="google-site-verification" content={env.PUBLIC_GOOGLE_SITE_VERIFICATION} />
	{/if}
	{#if env.PUBLIC_BING_SITE_VERIFICATION}
		<meta name="msvalidate.01" content={env.PUBLIC_BING_SITE_VERIFICATION} />
	{/if}
	<meta property="og:site_name" content="Ace Blocker" />
	<meta property="og:image" content={defaultOgImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={m.site_og_image_alt()} />
	<meta property="og:type" content="website" />
	<meta
		property="og:locale"
		content={{ en: 'en_US', es: 'es_ES', it: 'it_IT', de: 'de_DE' }[
			localeFromPath(page.url.pathname)
		]}
	/>
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={defaultOgImage} />
	<meta name="twitter:image:alt" content={m.site_og_image_alt()} />
	{#if isIndexablePage(page.url.pathname)}
		<link rel="canonical" href={canonicalUrl(page.url.pathname)} />
		<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON serialization escapes all '<' characters -->
		{@html jsonLdScript(organizationAndWebsiteData())}
		{#each alternateUrls(page.url.pathname) as alternate (alternate.locale)}
			<link rel="alternate" hreflang={alternate.locale} href={alternate.url} />
		{/each}
		<link rel="alternate" hreflang="x-default" href={SITE_URL + basePath(page.url.pathname)} />
	{:else}
		<meta name="robots" content="noindex, nofollow" />
	{/if}
</svelte:head>

<ModeWatcher defaultMode="light" track={true} />

{@render children()}
<div style="display:none">
	{#each locales as locale (locale)}
		<a href={resolve(localizeHref(page.url.pathname, { locale }) as '/')}>
			{locale}
		</a>
	{/each}
</div>
