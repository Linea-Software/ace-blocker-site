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
	import { resolve } from '$app/paths';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
	import './layout.css';

	let { children } = $props();

	const defaultOgImage = $derived(new URL('/ace-social-preview.png', page.url.origin).href);
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="16x16" href="/ace-favicon-16.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="/ace-favicon-32.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/ace-apple-touch-icon.png" />
	<link rel="shortcut icon" href="/ace-favicon-32.png" />

	<meta property="og:site_name" content="Ace Blocker" />
	<meta property="og:image" content={defaultOgImage} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta property="og:image:alt" content={m.site_og_image_alt()} />
	<meta property="og:type" content="website" />
	<meta property="og:locale" content="en_US" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:image" content={defaultOgImage} />
	<meta name="twitter:image:alt" content={m.site_og_image_alt()} />
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
