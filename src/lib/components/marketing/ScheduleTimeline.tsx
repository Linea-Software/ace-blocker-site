import { createSignal, For, Show } from 'solid-js';
import * as m from '$lib/paraglide/messages';
import styles from './ScheduleTimeline.module.css';
const cls = (value: string) =>
	value
		.split(/\s+/)
		.map((part) => (styles[part] ? part + ' ' + styles[part] : part))
		.join(' ');
const days = [
	m.week_mon_short,
	m.week_tue_short,
	m.week_wed_short,
	m.week_thu_short,
	m.week_fri_short,
	m.week_sat_short,
	m.week_sun_short
];

export default function ScheduleTimeline() {
	const [mode, setMode] = createSignal<'always' | 'scheduled'>('always');
	return (
		<div class={cls('schedule-card')} aria-label={m.schedule_visual_label()}>
			<div class={cls('schedule-header')}>
				<p>{m.policy_schedule_label()}</p>
				<span>{m.schedule_timezone()}</span>
			</div>
			<div
				class={cls('activation-choice')}
				role="group"
				aria-label={m.policy_schedule_label()}
			>
				<button
					type="button"
					class={mode() === 'always' ? cls('selected') : ''}
					aria-pressed={mode() === 'always' ? 'true' : 'false'}
					onClick={() => setMode('always')}
				>
					24/7
				</button>
				<button
					type="button"
					class={mode() === 'scheduled' ? cls('selected') : ''}
					aria-pressed={mode() === 'scheduled' ? 'true' : 'false'}
					onClick={() => setMode('scheduled')}
				>
					{m.policy_schedule_summary()}
				</button>
			</div>
			<div
				class={cls('timeline')}
				role="img"
				aria-label={mode() === 'always' ? '24/7' : m.policy_schedule_summary()}
			>
				<div class={cls('scale')} aria-hidden="true">
					<span>00</span>
					<span>06</span>
					<span>12</span>
					<span>18</span>
					<span>24</span>
				</div>
				<div class={cls('rows')} aria-hidden="true">
					<For each={days}>
						{(day, index) => (
							<div class={cls('day-row')}>
								<span class={cls('day')}>{day()}</span>
								<span class={cls('track')}>
									<Show when={mode() === 'always' || index() < 5}>
										<span
											class={
												cls('window') +
												(mode() === 'always' ? ' ' + cls('all-day') : '')
											}
										/>
									</Show>
								</span>
							</div>
						)}
					</For>
				</div>
			</div>
		</div>
	);
}
