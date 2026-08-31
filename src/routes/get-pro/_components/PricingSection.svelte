<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Shield, Timer } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';

	let {
		pricing,
		billingCycle = $bindable('yearly'),
		onupgrade
	} = $props<{
		pricing: {
			symbol: string;
			monthlyPrice: string;
			yearlyPrice: string;
			yearlyStrikethrough: string;
			discountPercent: number;
		};
		billingCycle?: string;
		onupgrade: () => void;
	}>();
</script>

<!-- Billing Toggle -->
<div class="mb-16 flex justify-center">
	<div
		class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50"
	>
		<button
			class={cn(
				'flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-bold transition-all duration-200',
				billingCycle === 'monthly'
					? 'bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white'
					: 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
			)}
			onclick={() => (billingCycle = 'monthly')}
		>
			Monthly
		</button>
		<button
			class={cn(
				'flex items-center justify-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold transition-all duration-200',
				billingCycle === 'yearly'
					? 'bg-brand text-background shadow-[0_0_20px_rgba(255,191,0,0.2)]'
					: 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
			)}
			onclick={() => (billingCycle = 'yearly')}
		>
			Yearly
			<span
				class={cn(
					'rounded px-1.5 py-0.5 text-[10px] font-black uppercase',
					billingCycle === 'yearly'
						? 'bg-black/10'
						: 'bg-brand/20 text-amber-600 dark:text-brand'
				)}
			>
				-{pricing.discountPercent}%
			</span>
		</button>
	</div>
</div>

<!-- Pricing Grid -->
<div class="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
	<!-- Free Plan -->
	<Card.Root
		class="relative flex flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 dark:border-slate-800/50 dark:bg-slate-900/20"
	>
		<Card.Header class="space-y-6 pb-8">
			<div class="flex items-center gap-2">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
				>
					<Shield class="h-6 w-6" />
				</div>
				<Card.Title
					class="text-2xl font-black text-slate-900 dark:text-slate-200"
					>{m.plan_free_name()}</Card.Title
				>
			</div>
			<div class="flex flex-col">
				<div class="flex items-baseline gap-1">
					<span
						class="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-200"
						>{m.plan_free_price()}</span
					>
					<span class="text-slate-500">/forever</span>
				</div>
				<p class="mt-4 text-slate-600 dark:text-slate-400">
					{m.plan_free_description()}
				</p>
			</div>
		</Card.Header>
		<Card.Content class="flex flex-1 flex-col space-y-5">
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
				>
					<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
				</div>
				<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
					>{m.feature_unlimited_devices()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
				>
					<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
				</div>
				<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
					>{m.feature_blocks_unlimited()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
				>
					<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
				</div>
				<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
					>{m.feature_lists_basic()}</span
				>
			</div>
			<div class="mt-auto">
				<p class="text-center text-xs text-muted-foreground">
					No credit card required. Free forever.
				</p>
			</div>
		</Card.Content>
		<Card.Footer class="pt-8">
			<Button
				variant="outline"
				class="h-12 w-full border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
				href="/signup"
			>
				{m.cta_get_started()}
			</Button>
		</Card.Footer>
	</Card.Root>

	<!-- Pro Plan -->
	<Card.Root
		class="relative flex flex-col overflow-hidden border-2 border-brand bg-white shadow-xl transition-all duration-300 md:-mt-4 md:-mb-4 dark:bg-slate-900/60 dark:shadow-[0_0_50px_rgba(255,191,0,0.15)] dark:backdrop-blur-sm"
	>
		<!-- Savings Badge -->
		{#if billingCycle === 'yearly'}
			<div class="absolute top-0 right-0 p-4">
				<div class="flex flex-col items-end gap-1">
					<Badge
						class="border-none bg-brand px-4 py-1.5 text-[10px] font-black text-background shadow-lg"
					>
						{m.savings_badge({ percent: pricing.discountPercent })}
					</Badge>
				</div>
			</div>
		{/if}

		<Card.Header class="space-y-6 pb-8">
			<div class="flex items-center gap-3">
				<div class="relative flex h-12 w-12 items-center justify-center">
					<div
						class="absolute inset-0 animate-pulse rounded-xl bg-brand/20 blur-lg"
					></div>
					<div
						class="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-background"
					>
						<Shield class="absolute h-7 w-7 opacity-20" />
						<Timer class="h-7 w-7" />
					</div>
				</div>
				<Card.Title class="text-3xl font-black text-brand"
					>{m.plan_pro_name()}</Card.Title
				>
			</div>

			<div class="flex flex-col">
				<div class="flex items-baseline gap-2">
					{#if billingCycle === 'yearly'}
						<div class="flex flex-col">
							<span
								class="text-sm font-bold text-slate-400 line-through decoration-brand/50 dark:text-slate-500"
								>{pricing.symbol}{pricing.yearlyStrikethrough}</span
							>
							<div class="flex items-baseline gap-1">
								<span
									class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
									>{pricing.symbol}{pricing.yearlyPrice}</span
								>
								<span class="text-slate-500 dark:text-slate-400"
									>/year</span
								>
							</div>
						</div>
					{:else}
						<span
							class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
							>{pricing.symbol}{pricing.monthlyPrice}</span
						>
						<span class="text-slate-500 dark:text-slate-400">/month</span>
					{/if}
				</div>
				<!-- Trial Subtitle -->
				<p class="mt-2 text-sm font-bold text-amber-600 dark:text-brand/90">
					{m.trial_subtitle()}
				</p>
				<p
					class="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
				>
					{m.plan_pro_description()}
				</p>
			</div>
		</Card.Header>

		<Card.Content class="flex-1 space-y-5">
			<div class="mb-2 flex items-center gap-2">
				<div
					class="h-[1px] flex-1 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0"
				></div>
				<p
					class="text-[10px] font-black tracking-widest text-brand uppercase"
				>
					{m.feature_pro_plus_basic()}
				</p>
				<div
					class="h-[1px] flex-1 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0"
				></div>
			</div>

			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
				>
					<Check class="h-3.5 w-3.5 text-brand" />
				</div>
				<span class="text-sm font-bold text-slate-900 dark:text-white"
					>{m.feature_lists_all()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
				>
					<Check class="h-3.5 w-3.5 text-brand" />
				</div>
				<span class="text-sm font-bold text-slate-900 dark:text-white"
					>{m.feature_lists_custom()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
				>
					<Check class="h-3.5 w-3.5 text-brand" />
				</div>
				<span class="text-sm font-bold text-slate-900 dark:text-white"
					>{m.feature_cloud_backup()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
				>
					<Check class="h-3.5 w-3.5 text-brand" />
				</div>
				<span class="text-sm font-bold text-slate-900 dark:text-white"
					>{m.feature_scripts_premium()}</span
				>
			</div>
			<div class="flex items-center gap-4">
				<div
					class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
				>
					<Check class="h-3.5 w-3.5 text-brand" />
				</div>
				<span class="text-sm font-bold text-slate-900 dark:text-white"
					>{m.feature_unlimited_devices()}</span
				>
			</div>

			<p class="pt-2 text-[10px] leading-relaxed text-slate-500 italic">
				*Taxes included. Price at checkout will be converted to your local
				currency.
			</p>
		</Card.Content>

		<Card.Footer class="flex flex-col gap-3 pt-8 pb-10">
			<Button
				class="group relative h-16 w-full overflow-hidden bg-brand text-xl font-black text-white shadow-[0_10px_30px_rgba(255,191,0,0.3)] transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
				onclick={onupgrade}
			>
				<span class="relative z-10">{m.cta_upgrade_now()}</span>
				<div
					class="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-500 group-hover:translate-x-full"
				></div>
			</Button>
			<!-- Trial Caption -->
			<p class="text-center text-xs font-bold text-slate-400">
				{m.trial_cta_caption()}
			</p>
		</Card.Footer>
	</Card.Root>
</div>
