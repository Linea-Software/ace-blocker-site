<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	type ResistanceLevel = 'low' | 'medium' | 'high' | 'maximum';

	let { interactive = true }: { interactive?: boolean } = $props();
	let selected = $state<ResistanceLevel>('medium');

	const levels = [
		{ value: 'low', label: m.resistance_low, detail: m.resistance_low_detail },
		{ value: 'medium', label: m.resistance_medium, detail: m.resistance_medium_detail },
		{ value: 'high', label: m.resistance_high, detail: m.resistance_high_detail },
		{ value: 'maximum', label: m.resistance_maximum, detail: m.resistance_maximum_detail }
	] as const;

	const selectedItem = $derived(levels.find((level) => level.value === selected) ?? levels[1]);
</script>

<section
	class={['specimen-stage', !interactive && 'disabled']}
	aria-labelledby="marketing-resistance-meter-title"
>
	<div class="meter-heading">
		<h3 id="marketing-resistance-meter-title">{m.resistance_meter_title()}</h3>
		<p>{m.resistance_meter_description()}</p>
	</div>

	<div class="selector-plate" role="group" aria-label={m.resistance_meter_title()}>
		{#each levels as level (level.value)}
			{@const isSelected = selected === level.value}
			<button
				type="button"
				class={['selector-segment', isSelected && 'selected']}
				aria-pressed={isSelected}
				disabled={!interactive}
				onclick={() => (selected = level.value)}
			>
				<span>{level.label()}</span>
			</button>
		{/each}
	</div>

	<div class="effect-readout" aria-live="polite">
		<p>{selectedItem.detail()}</p>
	</div>
</section>

<style>
	.specimen-stage {
		container-type: inline-size;
		padding: clamp(18px, 2.6vw, 24px);
		border: 1px solid var(--border);
		border-radius: 8px;
		background: color-mix(in srgb, var(--muted) 42%, var(--background));
	}

	.meter-heading h3 {
		margin: 0;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 21px;
		font-weight: 600;
		line-height: 1;
		text-wrap: balance;
	}

	.meter-heading p {
		max-width: 640px;
		margin: 7px 0 0;
		color: var(--muted-foreground);
		font-size: 13px;
		line-height: 1.45;
	}

	.selector-plate {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		overflow: hidden;
		margin-top: 14px;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: color-mix(in srgb, var(--muted) 38%, var(--card));
	}

	.selector-segment {
		position: relative;
		min-width: 0;
		height: 64px;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 0;
		border-left: 1px solid var(--border);
		border-radius: 0;
		padding: 0 12px;
		background: transparent;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 16px;
		font-weight: 600;
		line-height: 1;
		cursor: pointer;
		text-align: center;
		touch-action: manipulation;
		transition:
			background 140ms ease,
			color 140ms ease;
	}

	.selector-segment:first-child {
		border-left: 0;
	}

	.selector-segment:hover:not(:disabled):not(.selected) {
		background: color-mix(in srgb, var(--foreground) 5%, transparent);
		color: var(--foreground);
	}

	.selector-segment:focus-visible {
		z-index: 1;
		outline: 2px solid var(--foreground);
		outline-offset: -4px;
	}

	.selector-segment:disabled {
		cursor: default;
	}

	.selector-segment.selected {
		background: color-mix(in srgb, var(--foreground) 9%, var(--card));
		color: var(--foreground);
		font-weight: 700;
	}

	.selector-segment.selected::after {
		position: absolute;
		right: 0;
		bottom: 0;
		left: 0;
		height: 4px;
		background: var(--signal);
		content: '';
	}

	.specimen-stage.disabled .selector-plate {
		opacity: 0.64;
	}

	.effect-readout {
		min-height: 30px;
		display: flex;
		align-items: center;
		margin-top: 10px;
	}

	.effect-readout p {
		margin: 0;
		color: var(--muted-foreground);
		font-size: 13px;
		line-height: 1.45;
	}

	@media (prefers-reduced-motion: reduce) {
		.selector-segment {
			transition: none;
		}
	}

	@container (max-width: 470px) {
		.specimen-stage {
			padding: 16px;
		}

		.selector-plate {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.selector-segment:nth-child(3) {
			border-left: 0;
		}

		.selector-segment:nth-child(n + 3) {
			border-top: 1px solid var(--border);
		}
	}
</style>
