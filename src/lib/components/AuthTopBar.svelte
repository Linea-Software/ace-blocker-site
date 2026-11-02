<script lang="ts">
	import { ArrowLeft } from '@lucide/svelte';
	import ThemeToggleButton from './ThemeToggleButton.svelte';
	import { resolve } from '$app/paths';

	let { backHref = '/', backLabel }: { backHref?: '/' | '/signin'; backLabel: string } = $props();
</script>

<div
	class="mb-8 flex w-full max-w-md items-center justify-between lg:absolute lg:top-8 lg:right-8 lg:mb-0 lg:w-auto lg:max-w-none lg:justify-end lg:gap-3"
>
	<ThemeToggleButton />
	<a
		href={resolve(backHref)}
		class="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
	>
		<ArrowLeft class="size-4" aria-hidden="true" />
		{backLabel}
	</a>
</div>
