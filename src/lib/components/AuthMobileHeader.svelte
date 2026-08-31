<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';

	let { switchHref, switchLabel } = $props<{ switchHref: string; switchLabel: string }>();

	const isDark = $derived(mode.current === 'dark');
</script>

<div class="mb-8 flex w-full max-w-md items-center justify-between lg:hidden">
	<a href="/" class="flex items-center gap-2 font-bold dark:text-white">
		{#if isDark}
			<img src={darkFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
		{:else}
			<img src={lightFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
		{/if}
	</a>
	<Button
		variant="ghost"
		href={switchHref}
		class="text-brand hover:bg-brand/10 hover:text-amber-400"
	>
		{switchLabel}
	</Button>
</div>
