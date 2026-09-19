<script lang="ts">
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

	let { switchHref, switchLabel } = $props<{
		switchHref: '/signup' | '/signin';
		switchLabel: string;
	}>();
	const isDark = $derived(mode.current === 'dark');
</script>

<div
	class="mb-8 flex w-full max-w-md items-center justify-between border-b border-border pb-5 lg:hidden"
>
	<a href={resolve('/')} class="inline-flex min-h-11 items-center">
		<img
			src={isDark ? darkFullLogo : lightFullLogo}
			alt={m.about_hero_app()}
			class="h-6 w-auto"
		/>
	</a>
	<a
		href={resolve(switchHref)}
		class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
	>
		{switchLabel}
	</a>
</div>
