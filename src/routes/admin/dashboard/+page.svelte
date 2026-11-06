<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Empty from '$lib/components/ui/empty';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import AudienceActivityChart from './_components/AudienceActivityChart.svelte';
	import MetricCard from './_components/MetricCard.svelte';
	import {
		Activity,
		ChartNoAxesCombined,
		CheckCircle2,
		Cloud,
		Gauge,
		Fingerprint,
		Globe2,
		MonitorSmartphone,
		TrendingDown,
		TrendingUp,
		UserPlus,
		Users
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { countMessage } from '$lib/utils/count-message';

	let { data } = $props();

	const numberFormatter = new Intl.NumberFormat();
	const percentFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

	const activityDays = $derived(
		data.activity.visits.map((visit, index) => ({
			day: visit.day,
			visits: visit.value,
			signups: data.activity.signups[index]?.value ?? 0
		}))
	);
	const visitsIncreasing = $derived(data.summary.visitTrend >= 0);

	const summaryStats = $derived([
		{
			label: m.admin_metrics_total_users(),
			value: formatNumber(data.summary.totalUsers),
			detail: countMessage(
				data.summary.weeklySignups,
				m.admin_metrics_weekly_signups_zero,
				m.admin_metrics_weekly_signups_one,
				() => m.admin_metrics_weekly_signups({ count: data.summary.weeklySignups })
			),
			icon: Users
		},
		{
			label: m.admin_metrics_active_pro(),
			value: formatNumber(data.summary.proUsers),
			detail: m.admin_metrics_conversion({ rate: data.health.proConversionRate }),
			icon: Gauge
		},
		{
			label: m.admin_metrics_monthly_visits(),
			value: formatNumber(data.summary.monthlyVisits),
			detail: countMessage(
				data.summary.weeklyVisits,
				m.admin_metrics_weekly_visits_zero,
				m.admin_metrics_weekly_visits_one,
				() => m.admin_metrics_weekly_visits({ count: data.summary.weeklyVisits })
			),
			icon: Activity
		},
		{
			label: m.admin_metrics_monthly_signups(),
			value: formatNumber(data.summary.monthlySignups),
			detail: countMessage(
				data.summary.totalVisits,
				m.admin_metrics_total_visits_zero,
				m.admin_metrics_total_visits_one,
				() => m.admin_metrics_total_visits({ count: data.summary.totalVisits })
			),
			icon: UserPlus
		}
	]);

	const healthStats = $derived([
		{
			label: m.admin_metrics_verified_users(),
			value: data.health.verifiedUsers,
			rate: data.health.verifiedRate,
			icon: CheckCircle2
		},
		{
			label: m.admin_metrics_two_factor(),
			value: data.health.twoFactorUsers,
			rate: data.health.twoFactorRate,
			icon: Fingerprint
		},
		{
			label: m.admin_metrics_cloud_backups(),
			value: data.health.cloudBackups,
			rate: data.health.cloudBackupRate,
			icon: Cloud
		}
	]);

	function formatNumber(value: number): string {
		return numberFormatter.format(value);
	}

	function formatPercent(value: number): string {
		return `${percentFormatter.format(value)}%`;
	}

	function formatDate(date: Date | string): string {
		return new Date(date).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>{m.admin_metrics_page_title()}</title>
</svelte:head>

<div class="flex flex-col gap-8">
	<header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<ChartNoAxesCombined aria-hidden="true" />
				{m.admin_metrics_eyebrow()}
			</div>
			<div>
				<h2 class="font-display text-3xl font-semibold">{m.admin_metrics_title()}</h2>
				<p class="mt-1 max-w-2xl text-muted-foreground">
					{m.admin_metrics_description()}
				</p>
			</div>
		</div>
		<Badge variant="outline" class="w-fit">
			<Activity aria-hidden="true" />
			{m.admin_metrics_live_snapshot()}
		</Badge>
	</header>

	<section
		class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
		aria-label={m.admin_metrics_summary()}
	>
		{#each summaryStats as stat (stat.label)}
			<MetricCard
				label={stat.label}
				value={stat.value}
				detail={stat.detail}
				Icon={stat.icon}
			/>
		{/each}
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,1fr)]">
		<Card.Root>
			<Card.Header class="flex items-start justify-between gap-4">
				<div>
					<Card.Title>{m.admin_metrics_activity_title()}</Card.Title>
					<Card.Description>{m.admin_metrics_activity_description()}</Card.Description>
				</div>
				<Badge variant={visitsIncreasing ? 'secondary' : 'destructive'}>
					{#if visitsIncreasing}
						<TrendingUp aria-hidden="true" />
					{:else}
						<TrendingDown aria-hidden="true" />
					{/if}
					{formatPercent(Math.abs(data.summary.visitTrend))}
				</Badge>
			</Card.Header>
			<Card.Content>
				<AudienceActivityChart days={activityDays} />
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_metrics_health_title()}</Card.Title>
				<Card.Description>{m.admin_metrics_health_description()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-5">
				{#each healthStats as metric (metric.label)}
					<div class="flex flex-col gap-2">
						<div class="flex items-center justify-between gap-3 text-sm">
							<span class="flex items-center gap-2 font-medium">
								<metric.icon
									class="size-4 text-muted-foreground"
									aria-hidden="true"
								/>
								{metric.label}
							</span>
							<span class="text-muted-foreground">
								{formatNumber(metric.value)} · {formatPercent(metric.rate)}
							</span>
						</div>
						<Progress value={metric.rate} class="h-2" aria-label={metric.label} />
					</div>
				{/each}
				<div class="rounded-lg border bg-muted/30 p-4">
					<div class="flex items-center justify-between gap-3">
						<span class="flex items-center gap-2 text-sm font-medium">
							<MonitorSmartphone
								class="size-4 text-muted-foreground"
								aria-hidden="true"
							/>
							{m.admin_metrics_active_sessions()}
						</span>
						<span class="text-xl font-bold"
							>{formatNumber(data.health.activeSessions)}</span
						>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</section>

	<section class="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Globe2 aria-hidden="true" />
					{m.admin_metrics_top_pages_title()}
				</Card.Title>
				<Card.Description>{m.admin_metrics_top_pages_description()}</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				{#each data.topPages as topPage, index (topPage.path)}
					<div class="flex items-center gap-3 rounded-lg border p-3">
						<span class="w-5 text-center text-xs font-semibold text-muted-foreground">
							{index + 1}
						</span>
						<span
							class="min-w-0 flex-1 truncate font-mono text-sm"
							title={topPage.path}
						>
							{topPage.path}
						</span>
						<Badge variant="secondary">{formatNumber(topPage.visits)}</Badge>
					</div>
				{:else}
					<Empty.Root class="min-h-44 border">
						<Empty.Header>
							<Empty.Media variant="icon">
								<Globe2 aria-hidden="true" />
							</Empty.Media>
							<Empty.Title>{m.admin_metrics_no_page_data()}</Empty.Title>
						</Empty.Header>
					</Empty.Root>
				{/each}
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>{m.admin_metrics_recent_users_title()}</Card.Title>
				<Card.Description>{m.admin_metrics_recent_users_description()}</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="overflow-hidden rounded-lg border">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>{m.admin_metrics_user()}</Table.Head>
								<Table.Head>{m.admin_metrics_status()}</Table.Head>
								<Table.Head class="text-right"
									>{m.admin_metrics_joined()}</Table.Head
								>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#each data.recentUsers as recentUser (recentUser.id)}
								<Table.Row>
									<Table.Cell>
										<div class="flex min-w-0 flex-col">
											<span class="truncate font-medium"
												>{recentUser.name}</span
											>
											<span class="truncate text-xs text-muted-foreground">
												{recentUser.email}
											</span>
										</div>
									</Table.Cell>
									<Table.Cell>
										<div class="flex flex-wrap gap-1.5">
											{#if recentUser.role === 'admin'}
												<Badge variant="outline"
													>{m.admin_metrics_admin()}</Badge
												>
											{/if}
											{#if recentUser.isPro}
												<Badge>{m.admin_metrics_pro()}</Badge>
											{:else if recentUser.emailVerified}
												<Badge variant="secondary"
													>{m.admin_metrics_verified()}</Badge
												>
											{:else}
												<Badge variant="outline"
													>{m.admin_metrics_unverified()}</Badge
												>
											{/if}
										</div>
									</Table.Cell>
									<Table.Cell class="text-right text-muted-foreground">
										{formatDate(recentUser.createdAt)}
									</Table.Cell>
								</Table.Row>
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="p-0">
										<Empty.Root class="min-h-44 rounded-none border-0">
											<Empty.Header>
												<Empty.Media variant="icon">
													<Users aria-hidden="true" />
												</Empty.Media>
												<Empty.Title
													>{m.admin_metrics_no_recent_users()}</Empty.Title
												>
											</Empty.Header>
										</Empty.Root>
									</Table.Cell>
								</Table.Row>
							{/each}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</section>
</div>
