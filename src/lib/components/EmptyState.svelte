<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Component } from 'svelte';

	/**
	 * Table empty-state row (renders `<tr><td colspan>`), used by the admin
	 * release tables. `circle` renders the site-packs variant (bordered icon
	 * circle + description); the default renders the compact variant.
	 */
	let {
		colspan = 5,
		Icon,
		title,
		description,
		actionLabel,
		onaction,
		circle = false
	}: {
		colspan?: number;
		Icon: Component;
		title: string;
		description?: string;
		actionLabel: string;
		onaction?: () => void;
		circle?: boolean;
	} = $props();
</script>

<tr>
	<td {colspan} class="px-6 py-16 text-center">
		<div class="flex flex-col items-center justify-center">
			<div
				class={circle
					? 'mb-4 flex size-12 items-center justify-center rounded-full border bg-muted'
					: 'mb-4 flex size-11 items-center justify-center rounded-xl bg-muted'}
			>
				<Icon class="size-5 text-muted-foreground" aria-hidden="true" />
			</div>
			<h3 class="text-sm font-semibold">{title}</h3>
			{#if description}
				<p class="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
			{/if}
			{#if onaction}
				<Button class="mt-5" size="sm" onclick={onaction}>
					{actionLabel}
				</Button>
			{/if}
		</div>
	</td>
</tr>
