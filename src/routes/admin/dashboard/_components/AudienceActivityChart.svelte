<script lang="ts">
	import * as Chart from '$lib/components/ui/chart';
	import * as Empty from '$lib/components/ui/empty';
	import * as m from '$lib/paraglide/messages';
	import { BarChart } from 'layerchart';
	import { ChartNoAxesCombined } from '@lucide/svelte';

	type ActivityDay = {
		day: string;
		visits: number;
		signups: number;
	};

	let { days }: { days: ActivityDay[] } = $props();

	const numberFormatter = new Intl.NumberFormat();
	const hasActivity = $derived(days.some((day) => day.visits > 0 || day.signups > 0));
	const xAxisTicks = $derived(
		days
			.filter((_, index) => index % 4 === 0 || index === days.length - 1)
			.map((day) => day.day)
	);
	const chartConfig = $derived({
		visits: {
			label: m.admin_metrics_visits(),
			color: 'var(--color-brand)'
		},
		signups: {
			label: m.admin_metrics_signups(),
			color: 'var(--muted-foreground)'
		}
	} satisfies Chart.ChartConfig);

	function formatChartDate(day: string): string {
		return new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			timeZone: 'UTC'
		});
	}
</script>

{#if hasActivity}
	<figure class="min-w-0" aria-labelledby="audience-activity-caption">
		<figcaption id="audience-activity-caption" class="sr-only">
			{m.admin_metrics_chart_label()}
		</figcaption>
		<div aria-hidden="true">
			<Chart.Container config={chartConfig} class="aspect-auto h-64 w-full min-w-0">
				<BarChart
					data={days}
					x="day"
					y="visits"
					axis
					legend
					seriesLayout="group"
					bandPadding={0.3}
					groupPadding={0.12}
					series={[
						{
							key: 'visits',
							label: chartConfig.visits.label,
							color: 'var(--color-visits)'
						},
						{
							key: 'signups',
							label: chartConfig.signups.label,
							color: 'var(--color-signups)'
						}
					]}
					props={{
						xAxis: {
							ticks: xAxisTicks,
							format: (value) => formatChartDate(String(value))
						},
						yAxis: {
							format: (value) => numberFormatter.format(Number(value))
						}
					}}
				>
					{#snippet tooltip()}
						<Chart.Tooltip labelFormatter={(value) => formatChartDate(String(value))} />
					{/snippet}
				</BarChart>
			</Chart.Container>
		</div>

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
				{#each days as day (day.day)}
					<tr>
						<td>{formatChartDate(day.day)}</td>
						<td>{numberFormatter.format(day.visits)}</td>
						<td>{numberFormatter.format(day.signups)}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</figure>
{:else}
	<Empty.Root class="min-h-64 border">
		<Empty.Header>
			<Empty.Media variant="icon">
				<ChartNoAxesCombined aria-hidden="true" />
			</Empty.Media>
			<Empty.Title>{m.admin_metrics_no_activity_data()}</Empty.Title>
			<Empty.Description>{m.admin_metrics_no_activity_description()}</Empty.Description>
		</Empty.Header>
	</Empty.Root>
{/if}
