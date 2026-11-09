<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { Check, Globe, LockKeyhole, LockOpen, Pencil, Plus } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { DemoPlayback } from './DemoPlayback.svelte';
	import WalkthroughControls from './WalkthroughControls.svelte';
	import DemoPointer from './DemoPointer.svelte';

	let { compact = false }: { compact?: boolean } = $props();
	type Stage = 'content' | 'schedule' | 'review' | 'result';
	let stage = $state<Stage>(untrack(() => (compact ? 'result' : 'content')));
	let category = $state(untrack(() => compact));
	let domain = $state('example.com');
	let addedDomain = $state('');
	let scheduleMode = $state<'always' | 'scheduled'>('always');
	let days = $state([true, true, true, true, true, false, false]);
	let from = $state('09:00');
	let until = $state('17:00');
	let enabled = $state(true);
	let locked = $state(false);
	let host = $state<HTMLElement>();
	const dayLabels = [
		m.week_mon_short,
		m.week_tue_short,
		m.week_wed_short,
		m.week_thu_short,
		m.week_fri_short,
		m.week_sat_short,
		m.week_sun_short
	];
	const steps = [m.demo_content(), m.demo_schedule(), m.demo_review()];
	const validTargets = $derived(category || !!addedDomain);
	const validSchedule = $derived(
		scheduleMode === 'always' || (days.some(Boolean) && from !== until)
	);
	const canContinue = $derived(validTargets && (stage === 'content' || validSchedule));
	const scheduleLabel = $derived.by(() => {
		if (scheduleMode === 'always') return m.demo_always();
		if (days.slice(0, 5).every(Boolean) && days.slice(5).every((day) => !day)) {
			return m.demo_weekdays_time({ from, until });
		}
		return m.demo_custom_schedule_summary({
			days: days.flatMap((active, index) => (active ? [dayLabels[index]()] : [])).join(', '),
			from,
			until
		});
	});

	function applyScript(step: number) {
		stage = 'content';
		category = false;
		addedDomain = '';
		scheduleMode = 'always';
		days = [true, true, true, true, true, false, false];
		from = '09:00';
		until = '17:00';
		enabled = true;
		locked = false;
		if (step >= 0) category = true;
		if (step >= 1) addedDomain = 'example.com';
		if (step >= 2) stage = 'schedule';
		if (step >= 3) scheduleMode = 'scheduled';
		if (step >= 4) stage = 'review';
		if (step >= 5) stage = 'result';
		if (step >= 6) locked = true;
	}
	const playback = new DemoPlayback(7, applyScript);
	const pointerTarget = $derived(
		['category', 'website', 'always', 'scheduled', 'review', 'enabled', 'lock'][
			playback.step
		] ?? ''
	);
	onDestroy(() => playback.dispose());

	function nextStage() {
		playback.manual();
		if (!canContinue) return;
		stage = stage === 'content' ? 'schedule' : stage === 'schedule' ? 'review' : 'result';
	}
	function previousStage() {
		playback.manual();
		stage = stage === 'review' ? 'schedule' : 'content';
	}
	function addWebsite() {
		playback.manual();
		const cleaned = domain
			.trim()
			.toLowerCase()
			.replace(/^https?:\/\//, '')
			.replace(/\/.*$/, '');
		if (/^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(cleaned)) addedDomain = cleaned;
	}
</script>

<div
	class:compact
	class="block-demo"
	data-testid="network-demo"
	aria-label={m.demo_network_label()}
	bind:this={host}
>
	{#if !compact}
		<div class="demo-meta">
			<span>{m.demo_network_label()}</span><span>{m.demo_simulation()}</span>
		</div>
		{#if stage !== 'result'}
			<nav class="steps" aria-label={m.demo_step_navigation()}>
				{#each steps as item, index (index)}
					<button
						type="button"
						class:active={stage === ['content', 'schedule', 'review'][index]}
						disabled={index > 0 && (!validTargets || (index > 1 && !validSchedule))}
						aria-current={stage === ['content', 'schedule', 'review'][index]
							? 'step'
							: undefined}
						onclick={() => {
							playback.manual();
							stage = (['content', 'schedule', 'review'] as Stage[])[index];
						}}
					>
						<span>{index + 1}</span>{item}
					</button>
				{/each}
			</nav>
		{/if}
	{/if}

	{#if stage === 'content' && !compact}
		<section class="demo-stage" aria-label={m.demo_content()}>
			<h3>{m.demo_content_heading()}</h3>
			<p>{m.demo_content_help()}</p>
			<label
				class="select-row"
				class:guide-active={playback.playing && pointerTarget === 'category'}
				data-demo-target="category"
			>
				<input
					type="checkbox"
					aria-label={m.site_pack_social()}
					checked={category}
					onchange={(event) => {
						playback.manual();
						category = event.currentTarget.checked;
					}}
				/>
				<span
					><strong>{m.site_pack_social()}</strong><small>{m.demo_category_free()}</small
					></span
				>
				<span class="tier">{m.site_pack_plan_free()}</span>
			</label>
			<div class="site-editor">
				<label for="demo-domain">{m.demo_optional_site()}</label>
				<div class="site-input">
					<input
						id="demo-domain"
						type="text"
						bind:value={domain}
						oninput={() => playback.manual()}
						placeholder="example.com"
					/>
					<button
						type="button"
						onclick={addWebsite}
						class:guide-active={playback.playing && pointerTarget === 'website'}
						data-demo-target="website"
						><Plus size={16} aria-hidden="true" />{m.demo_add()}</button
					>
				</div>
				{#if addedDomain}<p class="added" role="status">
						<Check size={15} aria-hidden="true" />{addedDomain}
					</p>{/if}
			</div>
			<div class="wizard-footer">
				<button
					type="button"
					class="primary"
					disabled={!canContinue}
					onclick={nextStage}
					data-demo-target="next-content">{m.demo_next()}</button
				>
			</div>
		</section>
	{:else if stage === 'schedule' && !compact}
		<section class="demo-stage" aria-label={m.demo_schedule()}>
			<h3>{m.demo_schedule_heading()}</h3>
			<p>{m.demo_schedule_help()}</p>
			<div class="mode-options" role="group" aria-label={m.demo_schedule()}>
				<button
					type="button"
					class:selected={scheduleMode === 'always'}
					aria-pressed={scheduleMode === 'always'}
					class:guide-active={playback.playing && pointerTarget === 'always'}
					data-demo-target="always"
					onclick={() => {
						playback.manual();
						scheduleMode = 'always';
					}}
				>
					<strong>{m.demo_always()}</strong><small>{m.demo_always_help()}</small>
				</button>
				<button
					type="button"
					class:selected={scheduleMode === 'scheduled'}
					aria-pressed={scheduleMode === 'scheduled'}
					class:guide-active={playback.playing && pointerTarget === 'scheduled'}
					data-demo-target="scheduled"
					onclick={() => {
						playback.manual();
						scheduleMode = 'scheduled';
					}}
				>
					<strong>{m.demo_scheduled()}</strong><small>{m.demo_scheduled_help()}</small>
				</button>
			</div>
			{#if scheduleMode === 'scheduled'}
				<fieldset class="week">
					<legend>{m.demo_select_days()}</legend>
					<div class="day-picker">
						{#each dayLabels as day, i (i)}
							<label class:chosen={days[i]}
								><input
									type="checkbox"
									checked={days[i]}
									onchange={(event) => {
										playback.manual();
										days[i] = event.currentTarget.checked;
									}}
								/><span>{day()}</span></label
							>
						{/each}
					</div>
					<div class="time-row">
						<label
							>{m.demo_from()}<input
								type="time"
								bind:value={from}
								onchange={() => playback.manual()}
							/></label
						>
						<label
							>{m.demo_until()}<input
								type="time"
								bind:value={until}
								onchange={() => playback.manual()}
							/></label
						>
					</div>
				</fieldset>
			{/if}
			<div class="wizard-footer">
				<button type="button" onclick={previousStage}>{m.demo_previous()}</button>
				<button
					type="button"
					class="primary"
					disabled={!canContinue}
					onclick={nextStage}
					data-demo-target="next-schedule">{m.demo_next()}</button
				>
			</div>
		</section>
	{:else if stage === 'review' && !compact}
		<section class="demo-stage" aria-label={m.demo_review()}>
			<h3>{m.demo_review_heading()}</h3>
			<p>{m.demo_review_help()}</p>
			<dl class="review">
				<div>
					<dt>{m.demo_content()}</dt>
					<dd>
						{category ? m.site_pack_social() : '—'}{#if addedDomain}<span
								>{addedDomain}</span
							>{/if}
					</dd>
				</div>
				<div>
					<dt>{m.demo_schedule()}</dt>
					<dd>{scheduleLabel}</dd>
				</div>
				<div>
					<dt>{m.demo_lock()}</dt>
					<dd>{m.demo_lock_after()}</dd>
				</div>
			</dl>
			<div class="wizard-footer">
				<button type="button" onclick={previousStage}>{m.demo_previous()}</button>
				<button
					type="button"
					class="primary"
					onclick={nextStage}
					class:guide-active={playback.playing && pointerTarget === 'review'}
					data-demo-target="review"
					><Check size={16} aria-hidden="true" />{m.demo_save_block()}</button
				>
			</div>
		</section>
	{:else}
		<div class="result-heading">
			<span>{m.demo_result_heading()}</span>
		</div>
		<article
			class:protected={locked}
			class:inactive={!enabled}
			class="policy-card"
			aria-label={m.demo_network_label()}
		>
			<span class="state-rail" aria-hidden="true"></span>
			<div class="policy-body">
				{#if locked}
					<div class="lock-seal">
						<LockKeyhole size={17} aria-hidden="true" /><span
							><strong>{m.demo_locked()}</strong><small>{m.demo_lock_warning()}</small
							></span
						>
					</div>
				{/if}
				<div class="policy-main">
					<div class="policy-identity">
						<p class="state-text">
							{!enabled
								? m.demo_disabled()
								: scheduleMode === 'always'
									? m.demo_enabled()
									: m.demo_scheduled()}
						</p>
						<div class="name">
							<Globe size={21} aria-hidden="true" />
							<div>
								<h3>{m.policy_name()}</h3>
								<p>{scheduleLabel}</p>
							</div>
						</div>
					</div>
					<div class="policy-actions">
						<div class="enabled-label">
							{m.demo_enabled_label()}
							<button
								type="button"
								role="switch"
								aria-checked={enabled}
								aria-label={m.demo_enabled_label()}
								disabled={locked && enabled}
								onclick={() => {
									playback.manual();
									enabled = !enabled;
								}}
								class:guide-active={playback.playing && pointerTarget === 'enabled'}
								data-demo-target="enabled"
								class:checked={enabled}
								class="switch"><span></span></button
							>
						</div>
						<button
							type="button"
							disabled={locked}
							onclick={() => {
								playback.manual();
								stage = 'content';
							}}><Pencil size={15} aria-hidden="true" />{m.demo_edit()}</button
						>
						<button
							type="button"
							disabled={locked}
							class:guide-active={playback.playing && pointerTarget === 'lock'}
							data-demo-target="lock"
							onclick={() => {
								playback.manual();
								locked = true;
							}}
							><LockOpen size={15} aria-hidden="true" />{locked
								? m.demo_locked()
								: m.demo_lock()}</button
						>
					</div>
				</div>
				<dl class="counts">
					<div>
						<dt>{m.policy_site_packs()}</dt>
						<dd>{category ? 1 : 0}</dd>
					</div>
					<div>
						<dt>{m.policy_rules()}</dt>
						<dd>{addedDomain ? 1 : 0}</dd>
					</div>
				</dl>
			</div>
		</article>
		{#if !compact}<p class="result-note" role="status">
				{locked ? m.demo_lock_warning() : m.demo_result_help()}
			</p>{/if}
	{/if}
	{#if !compact}
		<WalkthroughControls {playback} />
		<DemoPointer root={host} target={pointerTarget} playing={playback.playing} />
	{/if}
</div>

<style>
	.block-demo {
		position: relative;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 7px;
		background: var(--card);
	}
	.demo-meta,
	.result-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		padding: 12px 16px;
		font:
			12px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
		border-bottom: 1px solid var(--border);
	}
	.demo-meta span:last-child {
		color: var(--signal-deep);
	}
	.steps {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		background: var(--muted);
	}
	.steps button {
		display: flex;
		min-height: 46px;
		gap: 9px;
		align-items: center;
		justify-content: center;
		border: 0;
		border-bottom: 2px solid var(--border);
		background: transparent;
		font-size: 13px;
		font-weight: 600;
		color: var(--muted-foreground);
		cursor: pointer;
	}
	.steps button.active {
		border-bottom-color: var(--signal);
		color: var(--foreground);
	}
	.steps span {
		font:
			11px 'IBM Plex Mono',
			monospace;
	}
	.demo-stage {
		padding: 22px;
		min-height: 285px;
	}
	.demo-stage h3 {
		margin: 0;
		font:
			600 23px/1.12 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.demo-stage > p {
		margin: 8px 0 20px;
		font-size: 13px;
		line-height: 1.5;
		color: var(--muted-foreground);
	}
	.select-row {
		display: flex;
		min-height: 62px;
		gap: 12px;
		align-items: center;
		padding: 12px;
		border: 1px solid var(--border);
		border-radius: 5px;
		cursor: pointer;
	}
	.select-row input {
		width: 19px;
		height: 19px;
		accent-color: var(--signal-deep);
	}
	.select-row > span:nth-child(2) {
		display: grid;
		gap: 2px;
		flex: 1;
	}
	.select-row strong {
		font-size: 14px;
	}
	.select-row small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.tier {
		font:
			11px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
	}
	.site-editor {
		margin-top: 16px;
	}
	.site-editor > label,
	.week legend {
		font-size: 12px;
		font-weight: 600;
	}
	.site-input {
		display: flex;
		gap: 8px;
		margin-top: 7px;
	}
	.site-input input {
		min-width: 0;
		flex: 1;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 10px;
		background: var(--background);
		color: var(--foreground);
		font-size: 13px;
	}
	.site-input button,
	.wizard-footer button {
		display: inline-flex;
		min-height: 40px;
		align-items: center;
		justify-content: center;
		gap: 6px;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 8px 12px;
		background: var(--card);
		font-size: 13px;
		font-weight: 600;
		cursor: pointer;
	}
	.added {
		display: flex;
		align-items: center;
		gap: 5px;
		margin: 8px 0 0;
		font-size: 12px;
		color: var(--foreground);
	}
	.wizard-footer {
		display: flex;
		justify-content: flex-end;
		gap: 8px;
		margin-top: 20px;
	}
	.wizard-footer .primary {
		background: var(--foreground);
		color: var(--background);
	}
	.mode-options {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.mode-options button {
		min-height: 84px;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: flex-start;
		gap: 6px;
		border: 1px solid var(--border);
		border-radius: 5px;
		padding: 12px;
		background: var(--card);
		color: var(--foreground);
		cursor: pointer;
		text-align: left;
	}
	.mode-options button.selected {
		border-color: var(--signal-deep);
		box-shadow: inset 3px 0 0 var(--signal);
	}
	.mode-options small {
		color: var(--muted-foreground);
		line-height: 1.35;
	}
	.week {
		margin-top: 16px;
		border: 0;
		padding: 0;
	}
	.day-picker {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, 1fr));
		gap: 4px;
		margin-top: 8px;
	}
	.day-picker label {
		display: grid;
		min-height: 42px;
		place-items: center;
		border: 1px solid var(--border);
		border-radius: 3px;
		cursor: pointer;
	}
	.day-picker label.chosen {
		background: var(--foreground);
		color: var(--background);
	}
	.day-picker input {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
	}
	.day-picker input:focus-visible + span {
		outline: 2px solid var(--signal-deep);
		outline-offset: 4px;
	}
	.time-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 12px;
	}
	.time-row label {
		display: grid;
		gap: 5px;
		font-size: 12px;
	}
	.time-row input {
		max-width: 140px;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 9px;
		background: var(--card);
		color: var(--foreground);
	}
	.review {
		border-block: 1px solid var(--border);
	}
	.review > div {
		display: grid;
		grid-template-columns: 120px minmax(0, 1fr);
		gap: 10px;
		padding: 14px 0;
		border-bottom: 1px solid var(--border);
		font-size: 13px;
	}
	.review > div:last-child {
		border-bottom: 0;
	}
	.review dt {
		color: var(--muted-foreground);
	}
	.review dd {
		margin: 0;
		font-weight: 600;
		overflow-wrap: anywhere;
	}
	.review dd span {
		display: block;
		margin-top: 3px;
		font-weight: 400;
		color: var(--muted-foreground);
	}
	.policy-card {
		display: grid;
		grid-template-columns: 7px minmax(0, 1fr);
	}
	.state-rail {
		background: var(--signal);
	}
	.policy-card.inactive .state-rail {
		background: var(--ash);
	}
	.policy-card.protected {
		outline: 1px solid var(--signal-deep);
		outline-offset: -1px;
	}
	.lock-seal {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 9px 13px;
		border-bottom: 1px solid var(--signal-deep);
		background: color-mix(in srgb, var(--signal) 10%, var(--card));
	}
	.lock-seal span {
		display: grid;
		gap: 2px;
	}
	.lock-seal strong {
		font-size: 12px;
	}
	.lock-seal small {
		color: var(--muted-foreground);
		font-size: 11px;
	}
	.policy-main {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 12px;
		padding: 18px;
	}
	.policy-identity {
		min-width: 0;
		flex: 1;
	}
	.state-text {
		margin: 0 0 10px;
		font:
			600 12px 'IBM Plex Sans Condensed',
			sans-serif;
		color: var(--signal-deep);
	}
	.name {
		display: flex;
		align-items: flex-start;
		gap: 10px;
	}
	.name h3 {
		font:
			600 21px/1.1 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.name p {
		margin-top: 6px;
		color: var(--muted-foreground);
		font:
			12px 'IBM Plex Mono',
			monospace;
	}
	.policy-actions {
		display: flex;
		gap: 8px;
		flex-wrap: wrap;
		align-items: center;
	}
	.policy-actions > button {
		display: inline-flex;
		min-height: 38px;
		align-items: center;
		gap: 5px;
		border: 1px solid var(--border);
		border-radius: 4px;
		padding: 7px 9px;
		background: var(--card);
		font-size: 12px;
		cursor: pointer;
	}
	.enabled-label {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
	}
	.switch {
		position: relative;
		width: 39px;
		height: 22px;
		border: 0;
		border-radius: 20px;
		background: var(--ash);
		cursor: pointer;
	}
	.switch.checked {
		background: var(--signal-deep);
	}
	.switch span {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: white;
		transition: transform 130ms ease;
	}
	.switch.checked span {
		transform: translateX(17px);
	}
	.counts {
		display: flex;
		gap: 22px;
		margin: 0 18px 15px;
		padding-top: 13px;
		border-top: 1px solid var(--border);
	}
	.counts div {
		display: grid;
		gap: 4px;
	}
	.counts dt {
		font-size: 11px;
		color: var(--muted-foreground);
	}
	.counts dd {
		margin: 0;
		font:
			600 15px 'IBM Plex Mono',
			monospace;
	}
	.result-note {
		margin: 0;
		padding: 12px 18px;
		border-top: 1px solid var(--border);
		color: var(--muted-foreground);
		font-size: 12px;
	}
	button:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	[data-demo-target] {
		scroll-margin: 12px;
	}
	.guide-active {
		outline: 2px solid var(--signal-deep);
		outline-offset: 2px;
		background-color: color-mix(in srgb, var(--signal) 14%, var(--card));
	}

	@media (max-width: 520px) {
		.demo-stage {
			padding: 16px;
		}
		.policy-main {
			padding: 14px;
		}
		.policy-actions {
			width: 100%;
		}
		.steps button {
			font-size: 12px;
		}
		.mode-options {
			grid-template-columns: 1fr;
		}
		.review > div {
			grid-template-columns: 95px minmax(0, 1fr);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.switch span {
			transition: none;
		}
	}
</style>
