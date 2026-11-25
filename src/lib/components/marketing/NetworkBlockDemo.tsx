import { createSignal, createMemo, onSettled, For } from 'solid-js';
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
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { DemoPlayback } from './DemoPlayback';
import WalkthroughControls from './WalkthroughControls';
import DemoPointer from './DemoPointer';
import BlockedBrowserDemo from './BlockedBrowserDemo';
import styles from './NetworkBlockDemo.module.css';
const cls = (value: string) =>
	value
		.split(/\s+/)
		.map((part) => (styles[part] ? part + ' ' + styles[part] : part))
		.join(' ');

type Stage = 'content' | 'schedule' | 'review' | 'result';
export default function NetworkBlockDemo(props: { compact?: boolean }) {
	const compact = () => props.compact ?? false;
	const [stage, setStage] = createSignal<Stage>(compact() ? 'result' : 'content');
	const [category, setCategory] = createSignal(compact());
	const [domain, setDomain] = createSignal('example.com');
	const [addedDomain, setAddedDomain] = createSignal('');
	const [scheduleMode, setScheduleMode] = createSignal<'always' | 'scheduled'>(
		compact() ? 'scheduled' : 'always'
	);
	const [days, setDays] = createSignal([true, true, true, true, true, false, false]);
	const [from, setFrom] = createSignal('09:00');
	const [until, setUntil] = createSignal('17:00');
	const [enabled, setEnabled] = createSignal(true);
	const [locked, setLocked] = createSignal(false);
	const [lockDialogOpen, setLockDialogOpen] = createSignal(false);
	const [viewingDetails, setViewingDetails] = createSignal(false);
	const [browserOpen, setBrowserOpen] = createSignal(false);
	const [browserPhase, setBrowserPhase] = createSignal<'ready' | 'typed' | 'loading' | 'result'>(
		'ready'
	);
	let browserLoadTimer: ReturnType<typeof setTimeout> | undefined;
	const [lockKind, setLockKind] = createSignal<'reflection' | 'schedule' | 'until'>('until');
	const [lockConfirmation, setLockConfirmation] = createSignal(false);
	function defaultLockDate() {
		const date = new Date();
		date.setDate(date.getDate() + 1);
		const pad = (n: number) => String(n).padStart(2, '0');
		return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
	}
	const [lockEndDate, setLockEndDate] = createSignal(defaultLockDate());
	const [lockEndTime, setLockEndTime] = createSignal('18:00');
	const lockedNow = createMemo(() => locked() && lockKind() !== 'reflection');
	const lockEndValid = createMemo(
		() =>
			lockKind() !== 'until' ||
			new Date(lockEndDate() + 'T' + lockEndTime()).getTime() > Date.now()
	);
	const [host, setHost] = createSignal<HTMLElement>();
	const [demoReady, setDemoReady] = createSignal(false);
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
	const validTargets = createMemo(() => category() || !!addedDomain());
	const simulatedBlockActive = createMemo(() => {
		if (!enabled() || !addedDomain()) return false;
		if (scheduleMode() === 'always') return true;
		const toMinutes = (time: string) => {
			const [h, min] = time.split(':').map(Number);
			return h * 60 + min;
		};
		const start = toMinutes(from());
		const end = toMinutes(until());
		const minute = 10 * 60 + 30;
		if (start === end) return false;
		if (start < end) return days()[0] && start <= minute && minute < end;
		return (days()[0] && minute >= start) || (days()[6] && minute < end);
	});
	const validSchedule = createMemo(
		() => scheduleMode() === 'always' || (days().some(Boolean) && from() !== until())
	);
	const canContinue = createMemo(
		() => validTargets() && (stage() === 'content' || validSchedule())
	);
	const previewSegments = createMemo(() => {
		const toMinute = (value: string) => {
			const [h, min] = value.split(':').map(Number);
			return h * 60 + min;
		};
		const start = toMinute(from());
		const end = toMinute(until());
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
	const scheduleLabel = createMemo(() => {
		if (scheduleMode() === 'always') return m.demo_always();
		if (
			days().slice(0, 5).every(Boolean) &&
			days()
				.slice(5)
				.every((day) => !day)
		)
			return m.demo_weekdays_time({ from: from(), until: until() });
		return m.demo_custom_schedule_summary({
			days: days()
				.flatMap((active, index) => (active ? [dayLabels[index]()] : []))
				.join(', '),
			from: from(),
			until: until()
		});
	});
	function clearBrowserLoad() {
		if (browserLoadTimer !== undefined) clearTimeout(browserLoadTimer);
		browserLoadTimer = undefined;
	}
	function applyScript(step: number) {
		clearBrowserLoad();
		setBrowserOpen(false);
		setBrowserPhase('ready');
		setStage('content');
		setCategory(false);
		setAddedDomain('');
		setScheduleMode('always');
		setDays([true, true, true, true, true, false, false]);
		setFrom('09:00');
		setUntil('17:00');
		setEnabled(true);
		setLocked(false);
		setLockDialogOpen(false);
		setViewingDetails(false);
		setLockKind('reflection');
		setLockConfirmation(false);
		if (step >= 0) setCategory(true);
		if (step >= 1) setAddedDomain('example.com');
		if (step >= 2) setStage('schedule');
		if (step >= 3) setScheduleMode('scheduled');
		if (step >= 4) setStage('review');
		if (step >= 5) setStage('result');
		if (step >= 6) setLockDialogOpen(true);
		if (step >= 7) setLockKind('until');
		if (step >= 8) setLockConfirmation(true);
		if (step >= 9) {
			setLocked(true);
			setLockDialogOpen(false);
			setLockConfirmation(false);
		}
		if (step >= 10) setBrowserOpen(true);
		if (step >= 11) setBrowserPhase('typed');
		if (step >= 12) setBrowserPhase('loading');
		if (step >= 13) setBrowserPhase('result');
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
			{ target: 'lock-apply', travelMs: 620, settleMs: 840 },
			{ target: 'browser-open', travelMs: 690, settleMs: 850 },
			{ target: 'browser-address', travelMs: 720, settleMs: 950 },
			{ target: 'browser-go', travelMs: 600, settleMs: 380 },
			{ target: '', passive: true, settleMs: 1050 }
		],
		applyScript
	);
	const pointerTarget = () => playback.pointerTarget;
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
	onSettled(() => {
		setDemoReady(true);
		return () => {
			clearBrowserLoad();
			playback.dispose();
		};
	});
	function openBrowser() {
		playback.manual();
		clearBrowserLoad();
		setBrowserOpen(true);
		setBrowserPhase('ready');
	}
	function typeBrowserAddress() {
		playback.manual();
		clearBrowserLoad();
		setBrowserPhase('typed');
	}
	function navigateBrowser() {
		playback.manual();
		clearBrowserLoad();
		setBrowserPhase('loading');
		browserLoadTimer = setTimeout(() => {
			browserLoadTimer = undefined;
			setBrowserPhase('result');
		}, 950);
	}
	function closeBrowser() {
		playback.manual();
		clearBrowserLoad();
		setBrowserOpen(false);
		setBrowserPhase('ready');
	}
	function nextStage() {
		playback.manual();
		if (!canContinue()) return;
		setStage(stage() === 'content' ? 'schedule' : stage() === 'schedule' ? 'review' : 'result');
	}
	function previousStage() {
		playback.manual();
		setStage(stage() === 'review' ? 'schedule' : 'content');
	}
	function openLockDialog() {
		playback.manual();
		setLockKind('until');
		setLockConfirmation(false);
		setLockDialogOpen(true);
	}
	function requestLock() {
		playback.manual();
		if (!lockEndValid()) return;
		if (lockKind() !== 'reflection' && !lockConfirmation()) {
			setLockConfirmation(true);
			return;
		}
		setLocked(true);
		setLockDialogOpen(false);
		setLockConfirmation(false);
	}
	function selectLock(kind: 'reflection' | 'schedule' | 'until') {
		playback.manual();
		setLockKind(kind);
		setLockConfirmation(false);
	}
	function addWebsite() {
		playback.manual();
		const cleaned = domain()
			.trim()
			.toLowerCase()
			.replace(/^https?:\/\//, '')
			.replace(/\/.*$/, '');
		if (/^(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(cleaned)) setAddedDomain(cleaned);
	}
	return (
		<>
			<div
				class={cls('block-demo') + (compact() ? ' ' + cls('compact') : '')}
				data-testid="network-demo"
				aria-label={m.demo_network_label()}
				data-demo-ready={demoReady() ? 'true' : 'false'}
				ref={setHost}
			>
				{!compact() ? (
					<>
						<div class={cls('demo-meta')}>
							<span>{m.demo_network_label()}</span>
							<span>{m.demo_simulation()}</span>
						</div>
						{stage() !== 'result' ? (
							<>
								<nav class={cls('steps')} aria-label={m.demo_step_navigation()}>
									<For each={steps}>
										{(item, index) => (
											<>
												<button
													class={
														'' +
														(stage() ===
														['content', 'schedule', 'review'][index()]
															? ' ' + cls('active')
															: '')
													}
													type="button"
													disabled={
														index() > 0 &&
														(!validTargets() ||
															(index() > 1 && !validSchedule()))
													}
													aria-current={
														stage() ===
														['content', 'schedule', 'review'][index()]
															? 'step'
															: undefined
													}
													onClick={() => {
														playback.manual();
														setStage(
															(
																[
																	'content',
																	'schedule',
																	'review'
																] as Stage[]
															)[index()]
														);
													}}
												>
													<span>{index() + 1}</span>
													{item}
												</button>
											</>
										)}
									</For>
								</nav>
							</>
						) : null}
					</>
				) : null}

				{stage() === 'content' && !compact() ? (
					<>
						<section class={cls('demo-stage')} aria-label={m.demo_content()}>
							<h3>{m.demo_content_heading()}</h3>
							<p>{m.demo_content_help()}</p>
							<label
								class={
									cls('select-row') +
									((playback.phase === 'hover' || playback.phase === 'press') &&
									pointerTarget() === 'category'
										? ' ' + cls('guide-active')
										: '')
								}
								data-demo-target="category"
							>
								<input
									type="checkbox"
									aria-label={m.site_pack_social()}
									checked={category()}
									onChange={(event) => {
										playback.manual();
										setCategory(event.currentTarget.checked);
									}}
								/>
								<span>
									<strong>{m.site_pack_social()}</strong>
									<small>{m.demo_category_free()}</small>
								</span>
								<span class={cls('tier')}>{m.site_pack_plan_free()}</span>
							</label>
							<div class={cls('site-editor')}>
								<label for="demo-domain">{m.demo_optional_site()}</label>
								<div class={cls('site-input')}>
									<input
										id="demo-domain"
										type="text"
										value={domain()}
										onInput={(event) => {
											setDomain(event.currentTarget.value);
											playback.manual();
										}}
										placeholder="example.com"
									/>
									<button
										class={
											'' +
											((playback.phase === 'hover' ||
												playback.phase === 'press') &&
											pointerTarget() === 'website'
												? ' ' + cls('guide-active')
												: '')
										}
										type="button"
										onClick={addWebsite}
										data-demo-target="website"
									>
										<Plus size={16} aria-hidden="true" />
										{m.demo_add()}
									</button>
								</div>
								{addedDomain() ? (
									<>
										<p class={cls('added')} role="status">
											<Check size={15} aria-hidden="true" />
											{addedDomain()}
										</p>
									</>
								) : null}
							</div>
							<div class={cls('wizard-footer')}>
								<button
									class={cls('primary')}
									type="button"
									disabled={!canContinue()}
									onClick={nextStage}
									data-demo-target="next-content"
								>
									{m.demo_next()}
								</button>
							</div>
						</section>
					</>
				) : stage() === 'schedule' && !compact() ? (
					<>
						<section class={cls('demo-stage')} aria-label={m.demo_schedule()}>
							<h3>{m.demo_schedule_heading()}</h3>
							<p>{m.demo_schedule_help()}</p>
							<div
								class={cls('mode-options')}
								role="group"
								aria-label={m.demo_schedule()}
							>
								<button
									class={
										'' +
										(scheduleMode() === 'always' ? ' ' + cls('selected') : '') +
										((playback.phase === 'hover' ||
											playback.phase === 'press') &&
										pointerTarget() === 'always'
											? ' ' + cls('guide-active')
											: '')
									}
									type="button"
									aria-pressed={scheduleMode() === 'always' ? 'true' : 'false'}
									data-demo-target="always"
									onClick={() => {
										playback.manual();
										setScheduleMode('always');
									}}
								>
									<strong>{m.demo_always()}</strong>
									<small>{m.demo_always_help()}</small>
								</button>
								<button
									class={
										'' +
										(scheduleMode() === 'scheduled'
											? ' ' + cls('selected')
											: '') +
										((playback.phase === 'hover' ||
											playback.phase === 'press') &&
										pointerTarget() === 'scheduled'
											? ' ' + cls('guide-active')
											: '')
									}
									type="button"
									aria-pressed={scheduleMode() === 'scheduled' ? 'true' : 'false'}
									data-demo-target="scheduled"
									onClick={() => {
										playback.manual();
										setScheduleMode('scheduled');
									}}
								>
									<strong>{m.demo_scheduled()}</strong>
									<small>{m.demo_scheduled_help()}</small>
								</button>
							</div>
							{scheduleMode() === 'scheduled' ? (
								<>
									<fieldset class={cls('week')}>
										<legend>{m.demo_select_days()}</legend>
										<div class={cls('day-picker')}>
											<For each={dayLabels}>
												{(day, i) => (
													<>
														<label
															class={
																'' +
																(days()[i()]
																	? ' ' + cls('chosen')
																	: '')
															}
														>
															<input
																type="checkbox"
																checked={days()[i()]}
																onChange={(event) => {
																	playback.manual();
																	setDays((prev) =>
																		prev.map((day, index) =>
																			index === i()
																				? event
																						.currentTarget
																						.checked
																				: day
																		)
																	);
																}}
															/>
															<span>{day()}</span>
														</label>
													</>
												)}
											</For>
										</div>
										<div class={cls('time-row')}>
											<label>
												{m.demo_from()}
												<input
													type="time"
													value={from()}
													onInput={(event) => {
														setFrom(event.currentTarget.value);
													}}
													onChange={() => playback.manual()}
												/>
											</label>
											<label>
												{m.demo_until()}
												<input
													type="time"
													value={until()}
													onInput={(event) => {
														setUntil(event.currentTarget.value);
													}}
													onChange={() => playback.manual()}
												/>
											</label>
										</div>
										<div
											class={cls('coverage-preview')}
											aria-label={m.demo_weekly_preview()}
										>
											<div class={cls('coverage-heading')}>
												<strong>{m.demo_weekly_preview()}</strong>
												<span>{scheduleLabel()}</span>
											</div>
											<div class={cls('coverage-ruler')} aria-hidden="true">
												<span>00</span>
												<span>06</span>
												<span>12</span>
												<span>18</span>
												<span>24</span>
											</div>
											<For each={days()}>
												{(active, index) => (
													<>
														<div class={cls('coverage-row')}>
															<span class={cls('coverage-day')}>
																{dayLabels[index()]()}
															</span>
															<div class={cls('coverage-track')}>
																{active ? (
																	<>
																		<For
																			each={previewSegments()}
																		>
																			{(segment) => (
																				<>
																					<span
																						class={cls(
																							'coverage-block'
																						)}
																						style={{
																							left: segment.left,
																							width: segment.width
																						}}
																					></span>
																				</>
																			)}
																		</For>
																	</>
																) : null}
															</div>
														</div>
													</>
												)}
											</For>
										</div>
									</fieldset>
								</>
							) : null}
							<div class={cls('wizard-footer')}>
								<button type="button" onClick={previousStage}>
									{m.demo_previous()}
								</button>
								<button
									class={cls('primary')}
									type="button"
									disabled={!canContinue()}
									onClick={nextStage}
									data-demo-target="next-schedule"
								>
									{m.demo_next()}
								</button>
							</div>
						</section>
					</>
				) : stage() === 'review' && !compact() ? (
					<>
						<section class={cls('demo-stage')} aria-label={m.demo_review()}>
							<h3>{m.demo_review_heading()}</h3>
							<p>{m.demo_review_help()}</p>
							<dl class={cls('review')}>
								<div>
									<dt>{m.demo_content()}</dt>
									<dd>
										{category() ? m.site_pack_social() : '—'}
										{addedDomain() ? (
											<>
												<span>{addedDomain()}</span>
											</>
										) : null}
									</dd>
								</div>
								<div>
									<dt>{m.demo_schedule()}</dt>
									<dd>{scheduleLabel()}</dd>
								</div>
								<div>
									<dt>{m.demo_lock()}</dt>
									<dd>{m.demo_lock_after()}</dd>
								</div>
							</dl>
							<div class={cls('wizard-footer')}>
								<button type="button" onClick={previousStage}>
									{m.demo_previous()}
								</button>
								<button
									class={
										cls('primary') +
										((playback.phase === 'hover' ||
											playback.phase === 'press') &&
										pointerTarget() === 'review'
											? ' ' + cls('guide-active')
											: '')
									}
									type="button"
									onClick={nextStage}
									data-demo-target="review"
								>
									<Check size={16} aria-hidden="true" />
									{m.demo_save_block()}
								</button>
							</div>
						</section>
					</>
				) : browserOpen() && !compact() ? (
					<>
						<BlockedBrowserDemo
							domain={addedDomain()}
							phase={browserPhase()}
							blocked={simulatedBlockActive()}
							onAddress={typeBrowserAddress}
							onNavigate={navigateBrowser}
							onBack={closeBrowser}
						/>
					</>
				) : (
					<>
						<div class={cls('result-heading')}>
							<span>{m.demo_result_heading()}</span>
						</div>
						<article
							class={
								cls('policy-card') +
								(locked() ? ' ' + cls('protected') : '') +
								(!enabled() ? ' ' + cls('inactive') : '') +
								(scheduleMode() === 'scheduled' ? ' ' + cls('scheduled') : '')
							}
							aria-label={m.demo_network_label()}
						>
							<span class={cls('state-rail')} aria-hidden="true"></span>
							<div class={cls('policy-body')}>
								{locked() ? (
									<>
										<div class={cls('lock-seal')}>
											<LockKeyhole size={17} aria-hidden="true" />
											<span>
												<strong>{m.demo_locked()}</strong>
												<small>{m.demo_lock_warning()}</small>
											</span>
										</div>
									</>
								) : null}
								<div class={cls('policy-main')}>
									<div class={cls('policy-identity')}>
										<p class={cls('state-text')}>
											{!enabled()
												? m.demo_disabled()
												: scheduleMode() === 'always'
													? m.demo_enabled()
													: m.demo_scheduled()}
										</p>
										<div class={cls('name')}>
											<span class={cls('policy-icon')}>
												<Globe size={21} aria-hidden="true" />
											</span>
											<div>
												<h3>{m.policy_name()}</h3>
												<p>{scheduleLabel()}</p>
											</div>
										</div>
									</div>
									<div class={cls('policy-actions')}>
										<div class={cls('enabled-label')}>
											{m.demo_enabled_label()}
											<button
												class={
													cls('switch') +
													((playback.phase === 'hover' ||
														playback.phase === 'press') &&
													pointerTarget() === 'enabled'
														? ' ' + cls('guide-active')
														: '') +
													(enabled() ? ' ' + cls('checked') : '')
												}
												type="button"
												role="switch"
												aria-checked={enabled() ? 'true' : 'false'}
												aria-label={m.demo_enabled_label()}
												disabled={lockedNow() && enabled()}
												onClick={() => {
													playback.manual();
													setEnabled(!enabled());
												}}
												data-demo-target="enabled"
											>
												<span></span>
											</button>
										</div>
										<button
											type="button"
											onClick={() => {
												playback.manual();
												if (lockedNow()) setViewingDetails(true);
												else setStage('content');
											}}
										>
											{lockedNow() ? (
												<>
													<Eye size={15} aria-hidden="true" />
													{m.demo_view()}
												</>
											) : (
												<>
													<Pencil size={15} aria-hidden="true" />
													{m.demo_edit()}
												</>
											)}
										</button>
										<button
											class={
												'' +
												((playback.phase === 'hover' ||
													playback.phase === 'press') &&
												pointerTarget() === 'lock'
													? ' ' + cls('guide-active')
													: '')
											}
											type="button"
											data-demo-target="lock"
											onClick={() => {
												if (locked()) {
													playback.manual();
													setViewingDetails(true);
												} else openLockDialog();
											}}
										>
											{locked() ? (
												<>
													<LockKeyhole size={15} aria-hidden="true" />
													{m.demo_lock_active_short()}
												</>
											) : (
												<>
													<LockOpen size={15} aria-hidden="true" />
													{m.demo_lock()}
												</>
											)}
										</button>
									</div>
								</div>
								<dl class={cls('counts')}>
									<div>
										<dt>{m.policy_site_packs()}</dt>
										<dd>{category() ? 1 : 0}</dd>
									</div>
									<div>
										<dt>{m.policy_rules()}</dt>
										<dd>{addedDomain() ? 1 : 0}</dd>
									</div>
								</dl>
							</div>
						</article>
						{lockDialogOpen() && !compact() ? (
							<>
								<section
									class={cls('lock-config')}
									aria-labelledby="demo-lock-heading"
								>
									<div class={cls('lock-config-heading')}>
										<div>
											<span class={cls('lock-eyebrow')}>
												{m.demo_lock_protection_label()}
											</span>
											<h3 id="demo-lock-heading">
												{m.demo_lock_protect_heading()}
											</h3>
											<p>{m.demo_lock_choose_hint()}</p>
										</div>
										<button
											class={cls('icon-button')}
											type="button"
											aria-label={m.demo_lock_cancel()}
											onClick={() => {
												playback.manual();
												setLockDialogOpen(false);
											}}
										>
											<X size={17} aria-hidden="true" />
										</button>
									</div>
									<div
										class={cls('lock-options')}
										aria-label={m.demo_lock_mode_label()}
									>
										<For each={lockKinds}>
											{(kind) => (
												<>
													<button
														class={
															'' +
															(lockKind() === kind
																? ' ' + cls('selected')
																: '') +
															((playback.phase === 'hover' ||
																playback.phase === 'press') &&
															pointerTarget() === 'lock-until' &&
															kind === 'until'
																? ' ' + cls('guide-active')
																: '')
														}
														type="button"
														aria-pressed={
															lockKind() === kind ? 'true' : 'false'
														}
														disabled={
															kind === 'schedule' &&
															scheduleMode() !== 'scheduled'
														}
														data-demo-target={
															kind === 'until'
																? 'lock-until'
																: undefined
														}
														onClick={() => selectLock(kind)}
													>
														<span class={cls('lock-mode-icon')}>
															{kind === 'reflection' ? (
																<>
																	<Hourglass
																		size={17}
																		aria-hidden="true"
																	/>
																</>
															) : kind === 'schedule' ? (
																<>
																	<CalendarClock
																		size={17}
																		aria-hidden="true"
																	/>
																</>
															) : (
																<>
																	<LockKeyhole
																		size={17}
																		aria-hidden="true"
																	/>
																</>
															)}
														</span>
														<span>
															<strong>{lockTitle(kind)}</strong>
															<small>{lockDescription(kind)}</small>
														</span>
														{lockKind() === kind ? (
															<>
																<Check
																	size={16}
																	aria-hidden="true"
																/>
															</>
														) : null}
													</button>
												</>
											)}
										</For>
									</div>
									{lockKind() === 'until' ? (
										<>
											<div class={cls('lock-deadline')}>
												<label>
													{m.demo_lock_end_date()}
													<input
														type="date"
														value={lockEndDate()}
														onInput={(event) => {
															setLockEndDate(
																event.currentTarget.value
															);
														}}
														onChange={() => {
															playback.manual();
															setLockConfirmation(false);
														}}
													/>
												</label>
												<label>
													{m.demo_lock_end_time()}
													<input
														type="time"
														value={lockEndTime()}
														onInput={(event) => {
															setLockEndTime(
																event.currentTarget.value
															);
														}}
														onChange={() => {
															playback.manual();
															setLockConfirmation(false);
														}}
													/>
												</label>
											</div>
										</>
									) : null}
									{lockConfirmation() ? (
										<>
											<p class={cls('lock-warning')} role="status">
												{m.demo_lock_confirm_warning()}
											</p>
										</>
									) : null}
									<div class={cls('lock-config-actions')}>
										<button
											type="button"
											onClick={() => {
												playback.manual();
												setLockDialogOpen(false);
											}}
										>
											{m.demo_lock_cancel()}
										</button>
										<button
											class={
												cls('primary') +
												((playback.phase === 'hover' ||
													playback.phase === 'press') &&
												(pointerTarget() === 'lock-apply' ||
													pointerTarget() === 'lock-confirm')
													? ' ' + cls('guide-active')
													: '')
											}
											type="button"
											data-demo-target={
												lockConfirmation() ? 'lock-apply' : 'lock-confirm'
											}
											disabled={!lockEndValid()}
											onClick={requestLock}
										>
											<LockKeyhole size={15} aria-hidden="true" />
											{lockConfirmation()
												? m.demo_lock_apply()
												: m.demo_lock_continue()}
										</button>
									</div>
								</section>
							</>
						) : null}
						{viewingDetails() && !compact() ? (
							<>
								<section class={cls('view-config')} aria-label={m.demo_view()}>
									<div>
										<strong>{m.policy_name()}</strong>
										<p>{scheduleLabel()}</p>
										<p>
											{m.demo_lock_status()}: {lockTitle(lockKind())}
										</p>
									</div>
									<button type="button" onClick={() => setViewingDetails(false)}>
										{m.demo_lock_cancel()}
									</button>
								</section>
							</>
						) : null}
						{!compact() ? (
							<>
								<p class={cls('result-note')} role="status">
									{lockedNow() ? m.demo_lock_warning() : m.demo_result_help()}
								</p>
								{addedDomain() && !lockDialogOpen() ? (
									<>
										<div class={cls('browser-action')}>
											<button
												class={
													'' +
													((playback.phase === 'hover' ||
														playback.phase === 'press') &&
													pointerTarget() === 'browser-open'
														? ' ' + cls('guide-active')
														: '')
												}
												type="button"
												data-demo-target="browser-open"
												onClick={openBrowser}
											>
												<Globe size={16} aria-hidden="true" />
												{m.demo_browser_open()}
											</button>
											<small>{m.demo_browser_preview_note()}</small>
										</div>
									</>
								) : null}
							</>
						) : null}
					</>
				)}
				{!compact() ? (
					<>
						<WalkthroughControls playback={playback} />
						<DemoPointer
							root={host()}
							target={pointerTarget()}
							visible={playback.pointerVisible}
							phase={playback.phase}
							travelMs={playback.pointerTravelMs}
						/>
					</>
				) : null}
			</div>
		</>
	);
}
