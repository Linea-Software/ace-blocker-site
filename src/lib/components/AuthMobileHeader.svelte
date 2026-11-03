<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

	let {
		switchHref,
		switchLabel
	}: {
		switchHref: '/signup' | '/signin';
		switchLabel: string;
	} = $props();
</script>

<div
	class="mb-8 flex w-full max-w-md items-center justify-between border-b border-border pb-5 lg:hidden"
>
	<a href={resolve('/')} class="inline-flex min-h-11 items-center">
		<BrandLogo alt={m.about_hero_app()} class="h-10 w-auto" />
	</a>
	<a
		href={resolve(switchHref)}
		class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-3 text-sm font-medium hover:bg-accent"
	>
		{switchLabel}
	</a>
</div>
