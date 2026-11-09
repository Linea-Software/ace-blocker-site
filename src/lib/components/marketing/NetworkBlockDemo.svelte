<script lang="ts">
	import { onDestroy, onMount, untrack } from 'svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import {
		Check,
		Eye,
		Globe,
		LockKeyhole,
		LockOpen,
		Pencil,
		Plus,
		CalendarClock,
		Hourglass,
		X
	} from '@lucide/svelte';
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
	let scheduleMode = $state<'always' | 'scheduled'>(
		untrack(() => (compact ? 'scheduled' : 'always'))
	);
	let days = $state([true, true, true, true, true, false, false]);
	let from = $state('09:00');
	let until = $state('17:00');
	let enabled = $state(true);
	let locked = $state(false);
	let lockDialogOpen = $state(false);
	let viewingDetails = $state(false);
	let lockKind = $state<'reflection' | 'schedule' | 'until'>('until');
	let lockConfirmation = $state(false);
	function defaultLockDate() {
		const date = new SvelteDate();
		date.setDate(date.getDate() + 1);
		const pad = (n: number) => String(n).padStart(2, '0');
		return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
	}
	let lockEndDate = $state(defaultLockDate());
	let lockEndTime = $state('18:00');
	const lockedNow = $derived(locked && lockKind !== 'reflection');
	const lockEndValid = $derived(
		lockKind !== 'until' || new Date(lockEndDate + 'T' + lockEndTime).getTime() > Date.now()
	);
	let host = $state<HTMLElement>();
	let demoReady = $state(false);
	onMount(() => {
		demoReady = true;
	});
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
	const previewSegments = $derived.by(() => {
		const toMinute = (value: string) => {
			const [hours, minutes] = value.split(':').map(Number);
			return hours * 60 + minutes;
		};
		const start = toMinute(from);
		const end = toMinute(until);
		const intervals =
			start < end
				? [[start, end]]
				: end < start
					? [
							[start, 1440],
							[0, end]
						]
					: [];
		return intervals.map(([a, b]) => ({
			left: (a / 1440) * 100 + '%',
			width: ((b - a) / 1440) * 100 + '%'
		}));
	});
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
		lockDialogOpen = false;
		viewingDetails = false;
		lockKind = 'reflection';
		lockConfirmation = false;
		if (step >= 0) category = true;
		if (step >= 1) addedDomain = 'example.com';
		if (step >= 2) stage = 'schedule';
		if (step >= 3) scheduleMode = 'scheduled';
		if (step >= 4) stage = 'review';
		if (step >= 5) stage = 'result';
		if (step >= 6) lockDialogOpen = true;
		if (step >= 7) lockKind = 'until';
		if (step >= 8) lockConfirmation = true;
		if (step >= 9) {
			locked = true;
			lockDialogOpen = false;
			lockConfirmation = false;
		}
	}
	const playback = new DemoPlayback(
		[
			{ target: 'category', travelMs: 680 },
			{ target: 'website', travelMs: 610 },
			{ target: 'next-content', travelMs: 690, settleMs: 850 },
			{ target: 'scheduled', travelMs: 680 },
			{ target: 'next-schedule', travelMs: 680, settleMs: 850 },
			{ target: 'review', travelMs: 650, settleMs: 850 },
			{ target: 'lock', travelMs: 720, settleMs: 720 },
			{ target: 'lock-until', travelMs: 720 },
			{ target: 'lock-confirm', travelMs: 620, settleMs: 670 },
			{ target: 'lock-apply', travelMs: 620, settleMs: 840 }
		],
		applyScript
	);
	const pointerTarget = $derived(playback.pointerTarget);
	const lockKinds = ['reflection', 'schedule', 'until'] as const;
	function lockTitle(kind: (typeof lockKinds)[number]) {
		if (kind === 'reflection') return m.demo_lock_reflection();
		if (kind === 'schedule') return m.demo_lock_schedule();
		return m.demo_lock_until();
	}
	function lockDescription(kind: (typeof lockKinds)[number]) {
		if (kind === 'reflection') return m.demo_lock_reflection_description();
		if (kind === 'schedule') return m.demo_lock_schedule_description();
		return m.demo_lock_until_description();
	}
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
	function openLockDialog() {
		playback.manual();
		lockKind = 'until';
		lockConfirmation = false;
		lockDialogOpen = true;
	}
	function requestLock() {
		playback.manual();
		if (!lockEndValid) return;
		if (lockKind !== 'reflection' && !lockConfirmation) {
			lockConfirmation = true;
			return;
		}
		locked = true;
		lockDialogOpen = false;
		lockConfirmation = false;
	}
	function selectLock(kind: 'reflection' | 'schedule' | 'until') {
		playback.manual();
		lockKind = kind;
		lockConfirmation = false;
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
	data-demo-ready={demoReady}
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
				class:guide-active={(playback.phase === 'hover' || playback.phase === 'press') &&
					pointerTarget === 'category'}
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
						class:guide-active={(playback.phase === 'hover' ||
							playback.phase === 'press') &&
							pointerTarget === 'website'}
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
					class:guide-active={(playback.phase === 'hover' ||
						playback.phase === 'press') &&
						pointerTarget === 'always'}
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
					class:guide-active={(playback.phase === 'hover' ||
						playback.phase === 'press') &&
						pointerTarget === 'scheduled'}
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
					<div class="coverage-preview" aria-label={m.demo_weekly_preview()}>
						<div class="coverage-heading">
							<strong>{m.demo_weekly_preview()}</strong>
							<span>{scheduleLabel}</span>
						</div>
						<div class="coverage-ruler" aria-hidden="true">
							<span>00</span><span>06</span>
							<span>12</span><span>18</span><span>24</span>
						</div>
						{#each days as active, index (index)}
							<div class="coverage-row">
								<span class="coverage-day">{dayLabels[index]()}</span>
								<div class="coverage-track">
									{#if active}
										{#each previewSegments as segment (segment.left)}
											<span
												class="coverage-block"
												style:left={segment.left}
												style:width={segment.width}
											></span>
										{/each}
									{/if}
								</div>
							</div>
						{/each}
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
					class:guide-active={(playback.phase === 'hover' ||
						playback.phase === 'press') &&
						pointerTarget === 'review'}
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
							<span class="policy-icon"><Globe size={21} aria-hidden="true" /></span>
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
								disabled={lockedNow && enabled}
								onclick={() => {
									playback.manual();
									enabled = !enabled;
								}}
								class:guide-active={(playback.phase === 'hover' ||
									playback.phase === 'press') &&
									pointerTarget === 'enabled'}
								data-demo-target="enabled"
								class:checked={enabled}
								class="switch"><span></span></button
							>
						</div>
						<button
							type="button"
							onclick={() => {
								playback.manual();
								if (lockedNow) viewingDetails = true;
								else stage = 'content';
							}}
						>
							{#if lockedNow}<Eye size={15} aria-hidden="true" />{m.demo_view()}
							{:else}<Pencil size={15} aria-hidden="true" />{m.demo_edit()}{/if}
						</button>
						<button
							type="button"
							class:guide-active={(playback.phase === 'hover' ||
								playback.phase === 'press') &&
								pointerTarget === 'lock'}
							data-demo-target="lock"
							onclick={() => {
								if (locked) {
									playback.manual();
									viewingDetails = true;
								} else openLockDialog();
							}}
						>
							{#if locked}<LockKeyhole
									size={15}
									aria-hidden="true"
								/>{m.demo_lock_active_short()}
							{:else}<LockOpen size={15} aria-hidden="true" />{m.demo_lock()}{/if}
						</button>
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
		{#if lockDialogOpen && !compact}
			<section class="lock-config" aria-labelledby="demo-lock-heading">
				<div class="lock-config-heading">
					<div>
						<span class="lock-eyebrow">{m.demo_lock_protection_label()}</span>
						<h3 id="demo-lock-heading">{m.demo_lock_protect_heading()}</h3>
						<p>{m.demo_lock_choose_hint()}</p>
					</div>
					<button
						type="button"
						class="icon-button"
						aria-label={m.demo_lock_cancel()}
						onclick={() => {
							playback.manual();
							lockDialogOpen = false;
						}}
					>
						<X size={17} aria-hidden="true" />
					</button>
				</div>
				<div class="lock-options" aria-label={m.demo_lock_mode_label()}>
					{#each lockKinds as kind (kind)}
						<button
							type="button"
							class:selected={lockKind === kind}
							aria-pressed={lockKind === kind}
							disabled={kind === 'schedule' && scheduleMode !== 'scheduled'}
							data-demo-target={kind === 'until' ? 'lock-until' : undefined}
							class:guide-active={(playback.phase === 'hover' ||
								playback.phase === 'press') &&
								pointerTarget === 'lock-until' &&
								kind === 'until'}
							onclick={() => selectLock(kind)}
						>
							<span class="lock-mode-icon">
								{#if kind === 'reflection'}<Hourglass
										size={17}
										aria-hidden="true"
									/>
								{:else if kind === 'schedule'}<CalendarClock
										size={17}
										aria-hidden="true"
									/>
								{:else}<LockKeyhole size={17} aria-hidden="true" />{/if}
							</span>
							<span
								><strong>{lockTitle(kind)}</strong><small
									>{lockDescription(kind)}</small
								></span
							>
							{#if lockKind === kind}<Check size={16} aria-hidden="true" />{/if}
						</button>
					{/each}
				</div>
				{#if lockKind === 'until'}
					<div class="lock-deadline">
						<label
							>{m.demo_lock_end_date()}
							<input
								type="date"
								bind:value={lockEndDate}
								onchange={() => {
									playback.manual();
									lockConfirmation = false;
								}}
							/>
						</label>
						<label
							>{m.demo_lock_end_time()}
							<input
								type="time"
								bind:value={lockEndTime}
								onchange={() => {
									playback.manual();
									lockConfirmation = false;
								}}
							/>
						</label>
					</div>
				{/if}
				{#if lockConfirmation}
					<p class="lock-warning" role="status">{m.demo_lock_confirm_warning()}</p>
				{/if}
				<div class="lock-config-actions">
					<button
						type="button"
						onclick={() => {
							playback.manual();
							lockDialogOpen = false;
						}}>{m.demo_lock_cancel()}</button
					>
					<button
						type="button"
						class="primary"
						data-demo-target={lockConfirmation ? 'lock-apply' : 'lock-confirm'}
						class:guide-active={(playback.phase === 'hover' ||
							playback.phase === 'press') &&
							(pointerTarget === 'lock-apply' || pointerTarget === 'lock-confirm')}
						disabled={!lockEndValid}
						onclick={requestLock}
					>
						<LockKeyhole size={15} aria-hidden="true" />{lockConfirmation
							? m.demo_lock_apply()
							: m.demo_lock_continue()}
					</button>
				</div>
			</section>
		{/if}
		{#if viewingDetails && !compact}
			<section class="view-config" aria-label={m.demo_view()}>
				<div>
					<strong>{m.policy_name()}</strong>
					<p>{scheduleLabel}</p>
					<p>{m.demo_lock_status()}: {lockTitle(lockKind)}</p>
				</div>
				<button type="button" onclick={() => (viewingDetails = false)}
					>{m.demo_lock_cancel()}</button
				>
			</section>
		{/if}
		{#if !compact}<p class="result-note" role="status">
				{lockedNow ? m.demo_lock_warning() : m.demo_result_help()}
			</p>{/if}
	{/if}
	{#if !compact}
		<WalkthroughControls {playback} />
		<DemoPointer
			root={host}
			target={pointerTarget}
			visible={playback.pointerVisible}
			phase={playback.phase}
			travelMs={playback.pointerTravelMs}
		/>
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
	.coverage-preview {
		display: grid;
		gap: 5px;
		margin-top: 17px;
		padding: 13px 12px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--muted);
	}
	.coverage-heading {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 4px 10px;
		margin-bottom: 3px;
	}
	.coverage-heading strong {
		font-size: 12px;
	}
	.coverage-heading span {
		font:
			11px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
	}
	.coverage-ruler,
	.coverage-row {
		display: grid;
		grid-template-columns: 20px minmax(0, 1fr);
		align-items: center;
		gap: 10px;
	}
	.coverage-ruler {
		display: flex;
		justify-content: space-between;
		padding-left: 30px;
		font:
			10px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
	}
	.coverage-row {
		min-height: 17px;
	}
	.coverage-day {
		font:
			11px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
	}
	.coverage-track {
		position: relative;
		height: 9px;
		border-radius: 2px;
		background: color-mix(in srgb, var(--border) 82%, var(--card));
		overflow: hidden;
	}
	.coverage-block {
		position: absolute;
		top: 0;
		bottom: 0;
		background: var(--signal-deep);
		border-radius: 2px;
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
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		column-gap: 22px;
		row-gap: 16px;
		padding: 18px;
	}
	.policy-body {
		min-width: 0;
		container: network-card / inline-size;
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
		align-items: center;
		gap: 12px;
	}
	.policy-icon {
		display: grid;
		place-items: center;
		flex: 0 0 40px;
		width: 40px;
		height: 40px;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--muted);
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
		gap: 4px;
		flex-wrap: wrap;
		align-items: center;
		justify-content: flex-end;
		min-width: 0;
	}
	.policy-actions > button {
		display: inline-flex;
		min-height: 36px;
		align-items: center;
		gap: 6px;
		border: 1px solid transparent;
		border-radius: 4px;
		padding: 7px 9px;
		background: transparent;
		color: var(--foreground);
		white-space: nowrap;
		font-size: 12px;
		cursor: pointer;
	}
	.policy-actions > button:hover:not(:disabled) {
		border-color: var(--border);
		background: var(--muted);
	}
	.policy-actions > button[data-demo-target='lock']:not(:disabled) {
		border-color: color-mix(in srgb, var(--signal-deep) 45%, var(--border));
		color: var(--signal-deep);
	}
	.enabled-label {
		display: flex;
		align-items: center;
		gap: 8px;
		padding-right: 10px;
		margin-right: 4px;
		border-right: 1px solid var(--border);
		font-size: 12px;
		color: var(--muted-foreground);
		white-space: nowrap;
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
		flex-wrap: wrap;
		align-items: center;
		gap: 6px 16px;
		margin: 0 18px 15px;
		padding-top: 13px;
		border-top: 1px solid var(--border);
	}
	.counts div {
		display: inline-flex;
		align-items: baseline;
		gap: 5px;
	}
	.counts div + div {
		padding-left: 16px;
		border-left: 1px solid var(--border);
	}
	.counts dt {
		font-size: 11px;
		color: var(--muted-foreground);
	}
	.counts dd {
		margin: 0;
		font:
			500 12px 'IBM Plex Mono',
			monospace;
	}
	.lock-config,
	.view-config {
		display: grid;
		gap: 14px;
		margin: 14px 18px;
		padding: 17px;
		border: 1px solid var(--signal-deep);
		border-radius: 5px;
		background: var(--card);
	}
	.lock-config-heading {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 12px;
	}
	.lock-eyebrow {
		display: block;
		margin-bottom: 4px;
		color: var(--signal-deep);
		font:
			600 11px 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.lock-config h3 {
		margin: 0;
		font:
			600 21px 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.lock-config-heading p,
	.view-config p {
		margin: 5px 0 0;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.5;
	}
	.lock-config .icon-button {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: transparent;
		color: var(--foreground);
		cursor: pointer;
	}
	.lock-options {
		display: grid;
		gap: 7px;
	}
	.lock-options button {
		display: flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		min-height: 60px;
		padding: 10px 12px;
		text-align: left;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: var(--foreground);
		cursor: pointer;
	}
	.lock-options button.selected {
		border-color: var(--signal-deep);
		background: color-mix(in srgb, var(--signal) 9%, var(--card));
	}
	.lock-options button > span:nth-child(2) {
		display: grid;
		flex: 1;
		gap: 3px;
	}
	.lock-options strong {
		font-size: 12px;
	}
	.lock-options small {
		font-size: 11px;
		line-height: 1.35;
		color: var(--muted-foreground);
	}
	.lock-mode-icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex: 0 0 36px;
		border: 1px solid var(--border);
		border-radius: 3px;
	}
	.lock-deadline {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}
	.lock-deadline label {
		display: grid;
		gap: 5px;
		font-size: 12px;
	}
	.lock-deadline input {
		min-width: 0;
		padding: 8px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: var(--foreground);
		font-size: 12px;
	}
	.lock-warning {
		border-left: 3px solid var(--signal-deep);
		padding: 9px 12px;
		background: color-mix(in srgb, var(--signal) 10%, var(--card));
		font-size: 12px;
		line-height: 1.5;
	}
	.lock-config-actions {
		display: flex;
		justify-content: flex-end;
		flex-wrap: wrap;
		gap: 8px;
	}
	.lock-config-actions button,
	.view-config button {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		min-height: 40px;
		padding: 7px 12px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--card);
		color: var(--foreground);
		font-size: 12px;
		cursor: pointer;
	}
	.lock-config-actions button.primary {
		background: var(--foreground);
		color: var(--background);
	}
	.view-config {
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
	}
	@media (max-width: 520px) {
		.lock-config,
		.view-config {
			margin: 12px;
			padding: 12px;
		}
		.view-config {
			grid-template-columns: 1fr;
		}
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

	@container network-card (max-width: 600px) {
		.policy-main {
			grid-template-columns: minmax(0, 1fr);
			gap: 17px;
		}
		.policy-actions {
			justify-content: flex-start;
			width: 100%;
			padding-top: 12px;
			border-top: 1px solid var(--border);
		}
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
