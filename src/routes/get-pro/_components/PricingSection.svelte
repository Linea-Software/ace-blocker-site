<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { Check, Minus } from '@lucide/svelte';

	let {
		pricing,
		billingCycle = $bindable('yearly'),
		onupgrade
	}: {
		pricing: {
			monthlyPrice: string;
			yearlyPrice: string;
			yearlyStrikethrough: string;
			yearlySavings: string;
			discountPercent: number;
			monthlyTrialDays: number;
			yearlyTrialDays: number;
		};
		billingCycle?: string;
		onupgrade: () => void;
	} = $props();

	const trialDays = $derived(
		billingCycle === 'yearly' ? pricing.yearlyTrialDays : pricing.monthlyTrialDays
	);
	const billedPrice = $derived(
		billingCycle === 'yearly' ? pricing.yearlyPrice : pricing.monthlyPrice
	);
	const billingPeriod = $derived(
		billingCycle === 'yearly' ? m.pricing_per_year() : m.pricing_per_month()
	);

	const comparisonRows = [
		{
			label: m.pricing_network_blocks,
			basic: m.pricing_included,
			pro: m.pricing_included
		},
		{ label: m.pricing_curated_packs, basic: m.pricing_three_packs, pro: m.pricing_all_packs },
		{
			label: m.pricing_resistance,
			basic: m.pricing_standard_resistance,
			pro: m.pricing_full_resistance
		},
		{ label: m.pricing_cloud_backup, basic: null, pro: null, available: true },
		{ label: m.pricing_custom_packs, basic: null, pro: null, available: true }
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
				onclick={() => (billingCycle = 'monthly')}>{m.pricing_cycle_monthly()}</button
			>
			<button
				type="button"
				aria-pressed={billingCycle === 'yearly'}
				class={[
					'min-h-11 min-w-32 border-l border-border px-4 text-sm font-medium',
					billingCycle === 'yearly' ? 'bg-foreground text-background' : 'hover:bg-accent'
				]}
				onclick={() => (billingCycle = 'yearly')}
			>
				{m.pricing_cycle_yearly()}
				<span class="ml-2 font-mono text-[10px]"
					>{m.pricing_save_percent({ percent: pricing.discountPercent })}</span
				>
			</button>
		</div>
	</div>

	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<div class="grid md:grid-cols-2">
			<section
				class="flex min-w-0 flex-col border-b border-border p-6 sm:p-8 md:border-r md:border-b-0"
			>
				<div class="md:min-h-32">
					<div class="flex items-start justify-between gap-5">
						<div>
							<p class="font-display text-2xl font-semibold">{m.plan_free_name()}</p>
							<p class="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
								{m.plan_free_description()}
							</p>
						</div>
						<p class="font-mono text-xs text-muted-foreground">{m.plan_free_name()}</p>
					</div>
				</div>
				<div class="flex flex-col justify-start pt-5 md:min-h-48">
					<div class="flex items-end gap-2">
						<span class="font-display text-5xl font-semibold"
							>{m.plan_free_price()}</span
						>
						<span class="pb-1 text-sm text-muted-foreground">{m.pricing_forever()}</span
						>
					</div>
				</div>
				<a
					href={resolve('/signup')}
					class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-foreground/30 font-medium hover:bg-accent md:mt-0"
				>
					{m.cta_get_started()}
				</a>
				<p class="mt-3 min-h-10 text-xs text-muted-foreground">{m.pricing_free_note()}</p>
			</section>

			<section class="relative flex min-w-0 flex-col p-6 sm:p-8">
				<div class="absolute inset-x-0 top-0 h-1 bg-signal" aria-hidden="true"></div>
				<div class="md:min-h-32">
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
				</div>
				<div class="flex flex-col justify-start pt-5 md:min-h-48">
					{#if billingCycle === 'yearly'}
						<p class="text-sm text-muted-foreground">
							<span
								class="font-mono text-lg font-semibold text-foreground/75 line-through decoration-2"
								>{pricing.yearlyStrikethrough}</span
							>
							<span class="ml-2">{m.pricing_monthly_annual_equivalent()}</span>
						</p>
					{/if}
					<div class="mt-1 flex items-end gap-2">
						<span class="font-display text-5xl font-semibold tracking-tight"
							>{billedPrice}</span
						>
						<span class="pb-1 text-sm text-muted-foreground">{billingPeriod}</span>
					</div>
					{#if billingCycle === 'yearly'}
						<p class="mt-2 text-sm font-medium text-signal-deep dark:text-signal">
							{m.pricing_save_amount({
								amount: pricing.yearlySavings,
								percent: pricing.discountPercent
							})}
						</p>
					{/if}
				</div>
				<button
					type="button"
					class="ace-signal-action mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 font-semibold md:mt-0"
					onclick={onupgrade}
				>
					{trialDays === 14 ? m.pricing_start_trial() : m.pricing_get_pro_action()}
				</button>
				<p class="mt-3 min-h-10 text-xs leading-relaxed text-muted-foreground">
					{trialDays === 14
						? m.pricing_trial_terms({ price: billedPrice, period: billingPeriod })
						: m.pricing_recurring_terms({ price: billedPrice, period: billingPeriod })}
					{m.pricing_tax_checkout_note()}
				</p>
			</section>
		</div>

		<div class="border-t border-border">
			<div class="border-b border-border px-5 py-5 sm:px-8">
				<h2 class="font-display text-2xl font-semibold">{m.pricing_compare_title()}</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
					<colgroup
						><col class="w-[40%]" /><col class="w-[30%]" /><col
							class="w-[30%]"
						/></colgroup
					>
					<thead>
						<tr class="bg-muted/60">
							<th scope="col" class="px-3 py-3 font-semibold sm:px-8 sm:py-4"
								>{m.pricing_feature()}</th
							>
							<th
								scope="col"
								class="border-l border-border px-3 py-3 font-semibold sm:px-5 sm:py-4"
								>{m.pricing_basic()}</th
							>
							<th
								scope="col"
								class="border-l border-border bg-signal/10 px-3 py-3 font-semibold sm:px-5 sm:py-4"
								>{m.pricing_pro()}</th
							>
						</tr>
					</thead>
					<tbody>
						{#each comparisonRows as row (row.label())}
							<tr class="border-t border-border">
								<th scope="row" class="px-3 py-3 font-medium sm:px-8 sm:py-4"
									>{row.label()}</th
								>
								<td
									class="border-l border-border px-3 py-3 text-muted-foreground sm:px-5 sm:py-4"
								>
									{#if row.available}
										<Minus class="size-4" aria-hidden="true" />
										<span class="sr-only">{m.pricing_not_included()}</span>
									{:else}{row.basic?.()}{/if}
								</td>
								<td
									class="border-l border-border bg-signal/[0.045] px-3 py-3 font-medium sm:px-5 sm:py-4"
								>
									{#if row.available}
										<Check
											class="size-4 text-signal-deep dark:text-signal"
											aria-hidden="true"
										/>
										<span class="sr-only">{m.pricing_included()}</span>
									{:else}{row.pro?.()}{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>
</div>
