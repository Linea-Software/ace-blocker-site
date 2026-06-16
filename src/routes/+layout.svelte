<script lang="ts">
	import { page } from '$app/state';
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import { ModeWatcher } from 'mode-watcher';
	import './layout.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" type="image/png" sizes="16x16" href="https://cdn.aceblocker.com/icon.png" />
	<link rel="icon" type="image/png" sizes="32x32" href="https://cdn.aceblocker.com/icon.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="https://cdn.aceblocker.com/icon.png" />
	<link rel="shortcut icon" href="https://cdn.aceblocker.com/icon.png" />
</svelte:head>

<ModeWatcher defaultMode="light" track={true} />

{@render children()}
<div style="display:none">
	{#each locales as locale}
		<a href={localizeHref(page.url.pathname, { locale })}>
			{locale}
		</a>
	{/each}
</div>
