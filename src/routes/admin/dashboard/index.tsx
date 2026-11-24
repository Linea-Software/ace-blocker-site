import { createMemo, For, Show } from 'solid-js';
import {
	Activity,
	ChartNoAxesCombined,
	CheckCircle2,
	Cloud,
	Fingerprint,
	Globe2,
	Gauge,
	MonitorSmartphone,
	TrendingDown,
	TrendingUp,
	UserPlus,
	Users
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { countMessage } from '$lib/utils/count-message';
import { getDashboardData } from './data';
import MetricCard from './_components/MetricCard';
import AudienceActivityChart from './_components/AudienceActivityChart';
const card = 'min-w-0 rounded-lg border border-border bg-card';
const number = new Intl.NumberFormat();
const format = (n: number) => number.format(n);
const day = (v: string | Date) =>
	new Date(v).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

export default function AdminDashboardPage() {
	const data = createMemo(() => getDashboardData());
	const summary = createMemo(() => {
		const current = data();
		if (!current) return [];
		return [
			{
				label: m.admin_metrics_total_users(),
				value: format(current.summary.totalUsers),
				detail: countMessage(
					current.summary.weeklySignups,
					m.admin_metrics_weekly_signups_zero,
					m.admin_metrics_weekly_signups_one,
					() => m.admin_metrics_weekly_signups({ count: current.summary.weeklySignups })
				),
				Icon: Users
			},
			{
				label: m.admin_metrics_active_pro(),
				value: format(current.summary.proUsers),
				detail: m.admin_metrics_conversion({ rate: current.health.proConversionRate }),
				Icon: Gauge
			},
			{
				label: m.admin_metrics_monthly_visits(),
				value: format(current.summary.monthlyVisits),
				detail: countMessage(
					current.summary.weeklyVisits,
					m.admin_metrics_weekly_visits_zero,
					m.admin_metrics_weekly_visits_one,
					() => m.admin_metrics_weekly_visits({ count: current.summary.weeklyVisits })
				),
				Icon: Activity
			},
			{
				label: m.admin_metrics_monthly_signups(),
				value: format(current.summary.monthlySignups),
				detail: countMessage(
					current.summary.totalVisits,
					m.admin_metrics_total_visits_zero,
					m.admin_metrics_total_visits_one,
					() => m.admin_metrics_total_visits({ count: current.summary.totalVisits })
				),
				Icon: UserPlus
			}
		];
	});
	const health = createMemo(() => {
		const current = data();
		if (!current) return [];
		return [
			{
				label: m.admin_metrics_verified_users(),
				value: current.health.verifiedUsers,
				rate: current.health.verifiedRate,
				Icon: CheckCircle2
			},
			{
				label: m.admin_metrics_two_factor(),
				value: current.health.twoFactorUsers,
				rate: current.health.twoFactorRate,
				Icon: Fingerprint
			},
			{
				label: m.admin_metrics_cloud_backups(),
				value: current.health.cloudBackups,
				rate: current.health.cloudBackupRate,
				Icon: Cloud
			}
		];
	});
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<div class="flex flex-col gap-8">
						<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
							<div class="flex flex-col gap-2">
								<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
									<ChartNoAxesCombined class="size-5" />
									{m.admin_metrics_eyebrow()}
								</div>
								<h2 class="font-display text-3xl font-semibold">
									{m.admin_metrics_title()}
								</h2>
								<p class="mt-1 max-w-2xl text-muted-foreground">
									{m.admin_metrics_description()}
								</p>
							</div>
							<span class="flex w-fit items-center gap-2 rounded-md border px-3 py-1 text-sm">
								<Activity class="size-4" />
								{m.admin_metrics_live_snapshot()}
							</span>
						</header>
						<section
							class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
							aria-label={m.admin_metrics_summary()}
						>
							<For each={summary()}>{(stat) => <MetricCard {...stat} />}</For>
						</section>
						<section class="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
							<div class={card}>
								<div class="flex items-start justify-between gap-4 p-6">
									<div>
										<h3 class="text-lg font-semibold">
											{m.admin_metrics_activity_title()}
										</h3>
										<p class="mt-1 text-sm text-muted-foreground">
											{m.admin_metrics_activity_description()}
										</p>
									</div>
									<span class="flex items-center gap-1 rounded-md border px-2 py-1 text-sm">
										<Show
											when={current().summary.visitTrend >= 0}
											fallback={<TrendingDown class="size-4" />}
										>
											<TrendingUp class="size-4" />
										</Show>
										{Math.abs(current().summary.visitTrend)}%
									</span>
								</div>
								<div class="px-6 pb-6">
									<AudienceActivityChart
										days={current().activity.visits.map((visit, index) => ({
											day: visit.day,
											visits: visit.value,
											signups: current().activity.signups[index]?.value ?? 0
										}))}
									/>
								</div>
							</div>
							<div class={card}>
								<div class="p-6">
									<h3 class="text-lg font-semibold">
										{m.admin_metrics_health_title()}
									</h3>
									<p class="mt-1 text-sm text-muted-foreground">
										{m.admin_metrics_health_description()}
									</p>
								</div>
								<div class="flex flex-col gap-5 px-6 pb-6">
									<For each={health()}>
										{(metric) => (
											<div class="flex flex-col gap-2">
												<div class="flex items-center justify-between gap-3 text-sm">
													<span class="flex items-center gap-2 font-medium">
														<metric.Icon class="size-4 text-muted-foreground" />
														{metric.label}
													</span>
													<span class="text-muted-foreground">
														{format(metric.value)} · {metric.rate}%
													</span>
												</div>
												<div
													class="h-2 overflow-hidden rounded bg-muted"
													role="progressbar"
													aria-valuemin="0"
													aria-valuemax="100"
													aria-valuenow={metric.rate}
													aria-label={metric.label}
												>
													<div
														class="h-full bg-primary"
														style={{ width: metric.rate + '%' }}
													/>
												</div>
											</div>
										)}
									</For>
									<div class="rounded-lg border bg-muted/30 p-4">
										<div class="flex items-center justify-between gap-3">
											<span class="flex items-center gap-2 text-sm font-medium">
												<MonitorSmartphone class="size-4 text-muted-foreground" />
												{m.admin_metrics_active_sessions()}
											</span>
											<strong class="text-xl">
												{format(current().health.activeSessions)}
											</strong>
										</div>
									</div>
								</div>
							</div>
						</section>
						<section class="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
							<div class={card}>
								<div class="p-6">
									<h3 class="flex items-center gap-2 text-lg font-semibold">
										<Globe2 class="size-5" />
										{m.admin_metrics_top_pages_title()}
									</h3>
									<p class="mt-1 text-sm text-muted-foreground">
										{m.admin_metrics_top_pages_description()}
									</p>
								</div>
								<div class="flex flex-col gap-2 px-6 pb-6">
									<For
										each={current().topPages}
										fallback={
											<div class="flex min-h-44 items-center justify-center rounded-lg border text-sm">
												{m.admin_metrics_no_page_data()}
											</div>
										}
									>
										{(page, index) => (
											<div class="flex items-center gap-3 rounded-lg border p-3">
												<span class="w-5 text-center text-xs font-semibold text-muted-foreground">
													{index() + 1}
												</span>
												<span
													class="min-w-0 flex-1 truncate font-mono text-sm"
													title={page.path}
												>
													{page.path}
												</span>
												<span class="rounded border px-2 py-1 text-xs">
													{format(page.visits)}
												</span>
											</div>
										)}
									</For>
								</div>
							</div>
							<div class={card}>
								<div class="p-6">
									<h3 class="text-lg font-semibold">
										{m.admin_metrics_recent_users_title()}
									</h3>
									<p class="mt-1 text-sm text-muted-foreground">
										{m.admin_metrics_recent_users_description()}
									</p>
								</div>
								<div class="overflow-x-auto px-6 pb-6">
									<table class="w-full text-left">
										<thead>
											<tr class="border-b bg-muted/50 text-xs text-muted-foreground">
												<th class="px-3 py-3">{m.admin_metrics_user()}</th>
												<th class="px-3 py-3">
													{m.admin_metrics_status()}
												</th>
												<th class="px-3 py-3 text-right">
													{m.admin_metrics_joined()}
												</th>
											</tr>
										</thead>
										<tbody class="divide-y">
											<For
												each={current().recentUsers}
												fallback={
													<tr>
														<td colspan={3} class="p-8 text-center">
															{m.admin_metrics_no_recent_users()}
														</td>
													</tr>
												}
											>
												{(person) => (
													<tr>
														<td class="px-3 py-3">
															<div class="flex flex-col">
																<span class="truncate font-medium">
																	{person.name}
																</span>
																<span class="truncate text-xs text-muted-foreground">
																	{person.email}
																</span>
															</div>
														</td>
														<td class="px-3 py-3">
															<div class="flex flex-wrap gap-1">
																<Show
																	when={person.role === 'admin'}
																>
																	<span class="rounded border px-2 py-1 text-xs">
																		{m.admin_metrics_admin()}
																	</span>
																</Show>
																<span class="rounded border px-2 py-1 text-xs">
																	{person.isPro
																		? m.admin_metrics_pro()
																		: person.emailVerified
																			? m.admin_metrics_verified()
																			: m.admin_metrics_unverified()}
																</span>
															</div>
														</td>
														<td class="px-3 py-3 text-right text-sm text-muted-foreground">
															{day(person.createdAt)}
														</td>
													</tr>
												)}
											</For>
										</tbody>
									</table>
								</div>
							</div>
						</section>
					</div>
				</>
			)}
		</Show>
	);
}
