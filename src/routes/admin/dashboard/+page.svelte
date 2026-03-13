<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Users, Crown, Activity } from '@lucide/svelte';
	import { cn } from '$lib/utils';

	let { data } = $props();

	// Mock data for scaffolding, to be replaced by server-side data
	const stats = $derived([
		{
			title: 'Total Users',
			value: data.totalUsers ?? 0,
			description: 'Total registered accounts',
			icon: Users,
			color: 'text-blue-500'
		},
		{
			title: 'Pro Users',
			value: data.proUsers ?? 0,
			description: 'Active Pro licenses',
			icon: Crown,
			color: 'text-amber-500'
		},
		{
			title: 'Site Visits',
			value: data.siteVisits ?? 0,
			description: 'Marketing page pageviews',
			icon: Activity,
			color: 'text-emerald-500'
		}
	]);
</script>

<div class="space-y-8">
	<div>
		<h2 class="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
			Metrics Overview
		</h2>
		<p class="text-slate-600 dark:text-slate-400">
			Key performance indicators for the Ace Blocker ecosystem.
		</p>
	</div>

	<div class="grid gap-4 md:grid-cols-3">
		{#each stats as stat}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between pb-2">
					<Card.Title class="text-sm font-medium">{stat.title}</Card.Title>
					<stat.icon class={cn("h-4 w-4", stat.color)} />
				</Card.Header>
				<Card.Content>
					<div class="text-2xl font-black">{stat.value}</div>
					<p class="text-xs text-slate-500 dark:text-slate-400">
						{stat.description}
					</p>
				</Card.Content>
			</Card.Root>
		{/each}
	</div>
</div>
