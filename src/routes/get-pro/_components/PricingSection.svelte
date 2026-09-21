<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

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

	const comparisonRows = [
		{
			label: m.pricing_network_blocks,
			basic: m.pricing_basic_blocks,
			pro: m.pricing_pro_blocks
		},
		{ label: m.pricing_curated_packs, basic: m.pricing_three_packs, pro: m.pricing_all_packs },
		{
			label: m.pricing_resistance,
			basic: m.pricing_standard_resistance,
			pro: m.pricing_full_resistance
		},
		{ label: m.pricing_cloud_backup, basic: m.pricing_not_included, pro: m.pricing_included },
		{ label: m.pricing_custom_packs, basic: m.pricing_not_included, pro: m.pricing_included }
	];
</script>

<div class="space-y-10">
	<div class="flex justify-start">
		<div
			class="inline-grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card"
		>
			<button
				type="button"
				aria-pressed={billingCycle === 'monthly'}
				class={[
					'min-h-11 min-w-28 px-4 text-sm font-medium',
					billingCycle === 'monthly' ? 'bg-foreground text-background' : 'hover:bg-accent'
				]}
				onclick={() => (billingCycle = 'monthly')}
			>
				{m.pricing_cycle_monthly()}
			</button>
			<button
				type="button"
				aria-pressed={billingCycle === 'yearly'}
				class={[
					'min-h-11 min-w-32 border-l border-border px-4 text-sm font-medium',
					billingCycle === 'yearly' ? 'bg-foreground text-background' : 'hover:bg-accent'
				]}
				onclick={() => (billingCycle = 'yearly')}
			>
				<span>{m.pricing_cycle_yearly()}</span>
				<span class="ml-2 font-mono text-[10px]">
					{m.pricing_save_percent({ percent: pricing.discountPercent })}
				</span>
			</button>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<div class="grid md:grid-cols-2">
			<section class="border-b border-border p-6 sm:p-8 md:border-r md:border-b-0">
				<div class="flex items-start justify-between gap-5">
					<div>
						<p class="font-display text-2xl font-semibold">{m.plan_free_name()}</p>
						<p class="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
							{m.plan_free_description()}
						</p>
					</div>
					<p class="font-mono text-xs text-muted-foreground">{m.plan_free_name()}</p>
				</div>
				<div class="mt-9 flex items-end gap-2">
					<span class="font-display text-5xl font-semibold">{m.plan_free_price()}</span>
					<span class="pb-1 text-sm text-muted-foreground">{m.pricing_forever()}</span>
				</div>
				<a
					href={resolve('/signup')}
					class="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-foreground/30 font-medium hover:bg-accent"
				>
					{m.cta_get_started()}
				</a>
			</section>

			<section class="relative p-6 sm:p-8">
				<div class="absolute inset-x-0 top-0 h-1 bg-signal" aria-hidden="true"></div>
				<div class="flex items-start justify-between gap-5">
					<div>
						<p class="font-display text-2xl font-semibold">{m.plan_pro_name()}</p>
						<p class="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
							{m.plan_pro_description()}
						</p>
					</div>
					<p class="font-mono text-xs text-signal-deep dark:text-signal">
						{m.plan_pro_name()}
					</p>
				</div>
				<div class="mt-9">
					{#if billingCycle === 'yearly'}
						<p class="mb-1 font-mono text-xs text-muted-foreground line-through">
							{pricing.symbol}{pricing.yearlyStrikethrough}
						</p>
						<div class="flex items-end gap-2">
							<span class="font-display text-5xl font-semibold">
								{pricing.symbol}{pricing.yearlyPrice}
							</span>
							<span class="pb-1 text-sm text-muted-foreground"
								>{m.pricing_per_year()}</span
							>
						</div>
					{:else}
						<div class="flex items-end gap-2">
							<span class="font-display text-5xl font-semibold">
								{pricing.symbol}{pricing.monthlyPrice}
							</span>
							<span class="pb-1 text-sm text-muted-foreground"
								>{m.pricing_per_month()}</span
							>
						</div>
					{/if}
					<p class="mt-2 text-sm text-muted-foreground">{m.trial_subtitle()}</p>
				</div>
				<button
					type="button"
					class="ace-signal-action mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 font-semibold"
					onclick={onupgrade}
				>
					{m.pricing_upgrade_action()}
				</button>
				<p class="mt-3 text-xs text-muted-foreground">{m.pricing_tax_disclaimer()}</p>
			</section>
		</div>

		<div class="border-t border-border">
			<div class="border-b border-border px-5 py-5 sm:px-8">
				<h2 class="font-display text-2xl font-semibold">{m.pricing_compare_title()}</h2>
				<p class="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
					{m.pricing_compare_description()}
				</p>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full min-w-[36rem] border-collapse text-left text-sm">
					<thead>
						<tr class="bg-muted">
							<th class="px-5 py-3 font-medium sm:px-8">{m.pricing_feature()}</th>
							<th class="w-40 border-l border-border px-5 py-3 font-medium"
								>{m.pricing_basic()}</th
							>
							<th class="w-40 border-l border-border px-5 py-3 font-medium"
								>{m.pricing_pro()}</th
							>
						</tr>
					</thead>
					<tbody>
						{#each comparisonRows as row (row.label())}
							<tr class="border-t border-border">
								<th class="px-5 py-3.5 font-medium sm:px-8">{row.label()}</th>
								<td
									class="border-l border-border px-5 py-3.5 text-muted-foreground"
								>
									{row.basic()}
								</td>
								<td class="border-l border-border px-5 py-3.5 font-medium"
									>{row.pro()}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
