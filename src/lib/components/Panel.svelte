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
	} = $props<{
		variant?: 'default' | 'surface';
		class?: string;
		children?: Snippet;
	}>();
</script>

<div
	class={cn(
		variant === 'surface'
			? 'rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5 backdrop-blur-sm'
			: 'rounded-xl border border-border bg-card p-6',
		className
	)}
>
	{@render children?.()}
</div>
