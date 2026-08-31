<script lang="ts">
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
		actionLabel = 'Deploy First Build',
		onaction,
		circle = false
	} = $props<{
		colspan?: number;
		Icon: Component;
		title: string;
		description?: string;
		actionLabel?: string;
		onaction?: () => void;
		circle?: boolean;
	}>();
</script>

<tr>
	<td
		colspan={colspan}
		class={circle ? 'px-6 py-20' : 'px-6 py-20 text-center'}
	>
		<div
			class={circle
				? 'flex flex-col items-center justify-center text-center'
				: 'flex flex-col items-center justify-center'}
		>
			{#if circle}
				<div
					class="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 border border-slate-200 dark:border-white/10"
				>
					<Icon class="w-6 h-6 text-slate-400 dark:text-gray-600" />
				</div>
				<h3 class="text-sm font-semibold text-slate-700 dark:text-gray-300">
					{title}
				</h3>
				{#if description}
					<p class="text-xs text-slate-500 dark:text-gray-500 mt-1 mb-6">
						{description}
					</p>
				{/if}
			{:else}
				<Icon class="w-10 h-10 text-slate-400 dark:text-gray-600 mb-3" />
				<p class="text-sm font-medium text-slate-600 dark:text-gray-400 mb-4">
					{title}
				</p>
			{/if}
			{#if onaction}
				<button
					onclick={onaction}
					class="bg-brand/10 text-amber-600 dark:text-brand hover:bg-brand/20 border border-brand/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
				>
					{actionLabel}
				</button>
			{/if}
		</div>
	</td>
</tr>
