<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';
	import ThemeToggleButton from './ThemeToggleButton.svelte';

	let { backHref = '/', backLabel } = $props<{ backHref?: string; backLabel: string }>();
</script>

<div
	class="mb-8 w-full max-w-md lg:absolute lg:top-8 lg:right-8 lg:mb-0 lg:flex lg:items-center lg:justify-end lg:gap-4"
>
	<ThemeToggleButton />
	<Button
		variant="ghost"
		href={backHref}
		class="text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
	>
		<ArrowLeft class="mr-2 h-4 w-4" />
		{backLabel}
	</Button>
</div>
