<script lang="ts">
	import type { Snippet } from 'svelte';
	import { cn } from '$lib/utils';

	/**
	 * Card wrapper for the repeated `rounded-xl border … p-6` recipes.
	 * `variant="surface"` is the admin light-surface recipe
	 * (slate border/background); the default is the token card recipe.
	 */
	let {
		variant = 'default',
		class: className,
		children
	}: {
		variant?: 'default' | 'surface';
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div
	class={cn(
		variant === 'surface'
			? 'rounded-xl border border-slate-200 bg-slate-100 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5'
			: 'rounded-xl border border-border bg-card p-6',
		className
	)}
>
	{@render children?.()}
</div>
