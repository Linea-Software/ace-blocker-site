<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { interactive = true } = $props<{ interactive?: boolean }>();
	let selected = $state(2);

	const levels = [
		{ label: m.resistance_off, detail: m.resistance_off_detail },
		{ label: m.resistance_low, detail: m.resistance_low_detail },
		{ label: m.resistance_medium, detail: m.resistance_medium_detail },
		{ label: m.resistance_high, detail: m.resistance_high_detail },
		{ label: m.resistance_maximum, detail: m.resistance_maximum_detail }
	];
</script>

<div class="border-y border-border py-5" aria-label={m.resistance_visual_label()}>
	<div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
		<div class="grid grid-cols-5 gap-1.5">
			{#each levels as level, index (index)}
				<button
					type="button"
					disabled={!interactive}
					aria-pressed={selected === index}
					aria-label={level.label()}
					class={[
						'group flex min-h-32 flex-col justify-end rounded-md border px-1.5 pb-2 text-left transition-colors sm:min-h-40 sm:px-2.5',
						selected === index
							? index === 0
								? 'border-foreground/40 bg-card'
								: 'border-signal-deep bg-signal/10'
							: 'border-border bg-card hover:bg-accent',
						!interactive && 'cursor-default'
					]}
					onclick={() => interactive && (selected = index)}
				>
					<div
						class={[
							'mb-3 w-full border border-foreground/20 transition-[height,background-color] duration-150',
							selected === index && index > 0 ? 'bg-signal' : 'bg-foreground/15'
						]}
						style:height={16 + index * 18 + 'px'}
						aria-hidden="true"
					></div>
					<span class="truncate font-display text-xs font-semibold sm:text-sm"
						>{level.label()}</span
					>
				</button>
			{/each}
		</div>
		<div class="min-h-24 border-l-2 border-foreground pl-4">
			<p class="font-display text-xl font-semibold">{levels[selected].label()}</p>
			<p class="mt-2 text-sm leading-relaxed text-muted-foreground" aria-live="polite">
				{levels[selected].detail()}
			</p>
		</div>
	</div>
</div>
