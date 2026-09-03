<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { Component } from 'svelte';

	let {
		label,
		value,
		detail,
		Icon
	}: {
		label: string;
		value: string;
		detail: string;
		Icon: Component;
	} = $props();
</script>

<Card.Root class="gap-4 py-5">
	<Card.Header class="flex items-center justify-between px-5">
		<Card.Title class="text-sm font-medium text-muted-foreground">{label}</Card.Title>
		<div class="flex size-9 items-center justify-center rounded-lg bg-muted">
			<Icon class="size-4" aria-hidden="true" />
		</div>
	</Card.Header>
	<Card.Content class="px-5">
		<p class="text-3xl font-bold tracking-tight tabular-nums">{value}</p>
		<p class="mt-1 text-xs text-muted-foreground">{detail}</p>
	</Card.Content>
</Card.Root>
