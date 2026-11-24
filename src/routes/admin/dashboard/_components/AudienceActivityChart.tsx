import { For, Show } from 'solid-js';
import { ChartNoAxesCombined } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';

type ActivityDay = { day: string; visits: number; signups: number };
const formatDay = (value: string) =>
	new Date(value + 'T00:00:00Z').toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	});
export default function AudienceActivityChart(props: { days: ActivityDay[] }) {
	const active = () => props.days.some((day) => day.visits > 0 || day.signups > 0);
	const max = () => Math.max(1, ...props.days.flatMap((day) => [day.visits, day.signups]));
	return (
		<Show
			when={active()}
			fallback={
				<div class="flex min-h-64 flex-col items-center justify-center rounded-md border text-center">
					<ChartNoAxesCombined class="mb-3 size-8 text-muted-foreground" />
					<p class="font-medium">{m.admin_metrics_no_activity_data()}</p>
					<p class="mt-1 text-sm text-muted-foreground">
						{m.admin_metrics_no_activity_description()}
					</p>
				</div>
			}
		>
			<figure class="min-w-0" aria-labelledby="audience-activity-caption">
				<figcaption id="audience-activity-caption" class="sr-only">
					{m.admin_metrics_chart_label()}
				</figcaption>
				<div class="flex items-center justify-end gap-4 text-xs text-muted-foreground">
					<span class="flex items-center gap-1">
						<span class="size-2 bg-amber-500" />
						{m.admin_metrics_visits()}
					</span>
					<span class="flex items-center gap-1">
						<span class="size-2 bg-muted-foreground" />
						{m.admin_metrics_signups()}
					</span>
				</div>
				<svg
					viewBox="0 0 1000 280"
					class="h-64 w-full min-w-0"
					preserveAspectRatio="none"
					aria-hidden="true"
				>
					<For each={[0, 1, 2, 3, 4]}>
						{(i) => (
							<line
								x1="0"
								y1={12 + i * 58}
								x2="1000"
								y2={12 + i * 58}
								stroke="currentColor"
								stroke-opacity=".12"
								stroke-width="1"
							/>
						)}
					</For>
					<For each={props.days}>
						{(day, index) => {
							const barX = () => index() * 70 + 8;
							return (
								<g>
									<rect
										x={barX()}
										y={244 - (day.visits / max()) * 230}
										width="25"
										height={(day.visits / max()) * 230}
										fill="var(--color-brand,#FFB000)"
									>
										<title>
											{formatDay(day.day)}: {day.visits}{' '}
											{m.admin_metrics_visits()}
										</title>
									</rect>
									<rect
										x={barX() + 28}
										y={244 - (day.signups / max()) * 230}
										width="25"
										height={(day.signups / max()) * 230}
										fill="var(--muted-foreground,#888)"
									>
										<title>
											{formatDay(day.day)}: {day.signups}{' '}
											{m.admin_metrics_signups()}
										</title>
									</rect>
									<Show
										when={
											index() % 4 === 0 || index() === props.days.length - 1
										}
									>
										<text x={barX()} y="270" font-size="13" fill="currentColor">
											{formatDay(day.day)}
										</text>
									</Show>
								</g>
							);
						}}
					</For>
				</svg>
				<table class="sr-only">
					<caption>{m.admin_metrics_chart_label()}</caption>
					<thead>
						<tr>
							<th>{m.admin_metrics_date()}</th>
							<th>{m.admin_metrics_visits()}</th>
							<th>{m.admin_metrics_signups()}</th>
						</tr>
					</thead>
					<tbody>
						<For each={props.days}>
							{(day) => (
								<tr>
									<td>{formatDay(day.day)}</td>
									<td>{day.visits}</td>
									<td>{day.signups}</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
			</figure>
		</Show>
	);
}
