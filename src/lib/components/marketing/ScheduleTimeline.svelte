<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	let mode = $state<'always' | 'scheduled'>('always');

	const days = [
		m.week_mon_short,
		m.week_tue_short,
		m.week_wed_short,
		m.week_thu_short,
		m.week_fri_short,
		m.week_sat_short,
		m.week_sun_short
	];
</script>

<div class="schedule-card" aria-label={m.schedule_visual_label()}>
	<div class="schedule-header">
		<p>{m.policy_schedule_label()}</p>
		<span>{m.schedule_timezone()}</span>
	</div>

	<div class="activation-choice" role="group" aria-label={m.policy_schedule_label()}>
		<button
			type="button"
			class:selected={mode === 'always'}
			aria-pressed={mode === 'always'}
			onclick={() => (mode = 'always')}>24/7</button
		>
		<button
			type="button"
			class:selected={mode === 'scheduled'}
			aria-pressed={mode === 'scheduled'}
			onclick={() => (mode = 'scheduled')}>{m.policy_schedule_summary()}</button
		>
	</div>

	<div
		class="timeline"
		role="img"
		aria-label={mode === 'always' ? '24/7' : m.policy_schedule_summary()}
	>
		<div class="scale" aria-hidden="true">
			<span>00</span>
			<span>06</span>
			<span>12</span>
			<span>18</span>
			<span>24</span>
		</div>

		<div class="rows" aria-hidden="true">
			{#each days as day, index (index)}
				<div class="day-row">
					<span class="day">{day()}</span>
					<span class="track">
						{#if mode === 'always' || index < 5}
							<span class="window" class:all-day={mode === 'always'}></span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	.activation-choice {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr);
		gap: 8px;
		padding: 12px 14px 0;
	}

	.activation-choice button {
		min-width: 0;
		min-height: 42px;
		padding: 8px;
		border: 1px solid var(--border);
		border-radius: 4px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 600;
		cursor: pointer;
	}

	.activation-choice button.selected {
		border-color: var(--signal-deep);
		box-shadow: inset 0 3px var(--signal);
	}

	.activation-choice button:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}

	.window.all-day {
		left: 0;
		width: 100%;
	}

	.schedule-card {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--card);
	}

	.schedule-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 11px 14px;
		border-bottom: 1px solid var(--border);
	}

	.schedule-header p {
		margin: 0;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 15px;
		font-weight: 600;
	}

	.schedule-header span {
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
	}

	.timeline {
		display: grid;
		gap: 5px;
		padding: 13px 14px 15px;
	}

	.scale {
		margin-left: 31px;
		display: flex;
		justify-content: space-between;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		line-height: 1;
	}

	.rows {
		display: grid;
		gap: 5px;
	}

	.day-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr);
		align-items: center;
		gap: 5px;
	}

	.day {
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		font-weight: 500;
	}

	.track {
		position: relative;
		height: 8px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--muted);
	}

	.track::before,
	.track::after {
		content: '';
		position: absolute;
		inset-block: 0;
		width: 1px;
		background: color-mix(in srgb, var(--foreground) 12%, transparent);
	}

	.track::before {
		left: 50%;
	}

	.track::after {
		left: 75%;
	}

	.window {
		position: absolute;
		inset-block: 0;
		left: 37.5%;
		width: 33.333%;
		background: var(--signal);
	}
</style>
