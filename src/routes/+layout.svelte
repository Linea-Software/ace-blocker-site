<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from 'svelte-sonner';
	import './layout.css';
	import favicon from '$lib/assets/logo/SVG/icon.svg';

	let { children } = $props();
</script>

<ModeWatcher defaultMode="light" track={true} />

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<Toaster position="bottom-right" />

{@render children()}
<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
