<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let { interactive = true } = $props<{ interactive?: boolean }>();
	let selected = $state(1);

	const levels = [
		{ label: m.resistance_low, detail: m.resistance_low_detail },
		{ label: m.resistance_medium, detail: m.resistance_medium_detail },
		{ label: m.resistance_high, detail: m.resistance_high_detail },
		{ label: m.resistance_maximum, detail: m.resistance_maximum_detail }
	];
</script>

<section class="resistance-meter" aria-label={m.resistance_visual_label()}>
	<div class="meter-heading">
		<div>
			<h3>{m.resistance_meter_title()}</h3>
			<p>{m.resistance_meter_description()}</p>
		</div>
	</div>

	<div class="constraint-track" role="group" aria-label={m.resistance_meter_title()}>
		{#each levels as level, index (index)}
			<button
				type="button"
				disabled={!interactive}
				aria-pressed={selected === index}
				aria-label={level.label()}
				class:selected={selected === index}
				class="constraint-step"
				onclick={() => interactive && (selected = index)}
			>
				<span class="step-structure" aria-hidden="true">
					{#each [0, 1, 2, 3] as notch (notch)}
						<span
							class:filled={notch <= index}
							style:height={String(7 + notch * 4) + 'px'}
						></span>
					{/each}
				</span>
				<span class="step-index">{String(index + 1).padStart(2, '0')}</span>
				<strong>{level.label()}</strong>
			</button>
		{/each}
	</div>

	<div class="effect-readout" aria-live="polite">
		<div class="effect-copy">
			<span class="effect-label">{levels[selected].label()}</span>
			<p>{levels[selected].detail()}</p>
		</div>
		<div class="script-count">
			<span>{m.resistance_active_scripts()}</span>
			<strong>{m.resistance_scripts_count()}</strong>
		</div>
	</div>
</section>

<style>
	.resistance-meter {
		overflow: hidden;
		border: 1px solid var(--border);
		border-left: 7px solid var(--information);
		border-radius: 6px;
		background: var(--card);
	}

	.meter-heading {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 18px;
		padding: 15px 17px 13px;
		border-bottom: 1px solid var(--border);
	}

	h3 {
		margin: 0;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 20px;
		font-weight: 600;
		line-height: 1;
	}

	.meter-heading p {
		max-width: 620px;
		margin: 6px 0 0;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.45;
	}

	.constraint-track {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		border-bottom: 1px solid var(--border);
		background: color-mix(in srgb, var(--muted) 40%, transparent);
	}

	.constraint-step {
		position: relative;
		min-width: 0;
		min-height: 88px;
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr);
		grid-template-rows: auto auto;
		align-content: center;
		align-items: end;
		gap: 5px 8px;
		border: 0;
		border-right: 1px solid var(--border);
		border-radius: 0;
		padding: 11px;
		background: transparent;
		color: var(--foreground);
		text-align: left;
		cursor: pointer;
		transition:
			background 150ms ease,
			color 150ms ease;
	}

	.constraint-step:last-child {
		border-right: 0;
	}

	.constraint-step:hover:not(:disabled) {
		background: var(--card);
	}

	.constraint-step.selected {
		background: var(--foreground);
		color: var(--background);
	}

	.constraint-step.selected::after {
		content: '';
		position: absolute;
		inset: auto 10px 0;
		height: 4px;
		background: var(--signal);
	}

	.constraint-step:disabled {
		cursor: default;
	}

	.step-structure {
		grid-row: 1 / 3;
		height: 28px;
		display: flex;
		align-items: end;
		gap: 3px;
	}

	.step-structure span {
		width: 4px;
		background: currentColor;
		opacity: 0.18;
	}

	.step-structure span.filled {
		opacity: 0.88;
	}

	.selected .step-structure span.filled {
		background: var(--signal);
		opacity: 1;
	}

	.step-index {
		align-self: end;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
	}

	.selected .step-index {
		color: color-mix(in srgb, var(--background) 70%, transparent);
	}

	.constraint-step strong {
		min-width: 0;
		overflow: hidden;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: clamp(13px, 2.2vw, 16px);
		font-weight: 600;
		line-height: 1;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.effect-readout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 18px;
		padding: 12px 17px 13px;
		background: var(--card);
	}

	.effect-copy {
		min-width: 0;
	}

	.effect-label {
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 14px;
		font-weight: 600;
	}

	.effect-copy p {
		margin: 3px 0 0;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.4;
	}

	.script-count {
		min-width: 150px;
		padding-left: 16px;
		border-left: 1px solid var(--border);
	}

	.script-count span,
	.script-count strong {
		display: block;
	}

	.script-count span {
		color: var(--muted-foreground);
		font-size: 11px;
	}

	.script-count strong {
		margin-top: 2px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 500;
	}

	@media (max-width: 620px) {
		.constraint-track {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.constraint-step:nth-child(2) {
			border-right: 0;
		}

		.constraint-step:nth-child(-n + 2) {
			border-bottom: 1px solid var(--border);
		}

		.effect-readout {
			grid-template-columns: 1fr;
		}

		.script-count {
			min-width: 0;
			padding-top: 9px;
			padding-left: 0;
			border-top: 1px solid var(--border);
			border-left: 0;
		}
	}
</style>
