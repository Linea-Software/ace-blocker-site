import { For, Show } from 'solid-js';
import { Check, Minus } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { formatCurrency, type SupportedCurrency } from '$lib/utils/locale-currency';

export interface Pricing {
	currency: SupportedCurrency;
	monthlyPrice: string;
	yearlyPrice: string;
	yearlyStrikethrough: string;
	yearlySavings: string;
	discountPercent: number;
	monthlyTrialDays: number;
	yearlyTrialDays: number;
	monthlySlug?: string;
	yearlySlug?: string;
}
interface Props {
	pricing: Pricing;
	billingCycle: () => string;
	setBillingCycle: (cycle: 'yearly' | 'monthly') => void;
	onUpgrade: () => void;
}
type ComparisonRow = {
	label: () => string;
	basic?: () => string;
	pro?: () => string;
	available?: boolean;
};
const comparisonRows: ComparisonRow[] = [
	{ label: m.pricing_network_blocks, basic: m.pricing_included, pro: m.pricing_included },
	{ label: m.pricing_curated_packs, basic: m.pricing_three_packs, pro: m.pricing_all_packs },
	{ label: m.pricing_resistance, available: true },
	{ label: m.pricing_cloud_backup, available: true },
	{ label: m.pricing_custom_packs, available: true }
];
export default function PricingSection(props: Props) {
	const yearly = () => props.billingCycle() === 'yearly';
	const trialDays = () =>
		yearly() ? props.pricing.yearlyTrialDays : props.pricing.monthlyTrialDays;
	const billedPrice = () => (yearly() ? props.pricing.yearlyPrice : props.pricing.monthlyPrice);
	const period = () => (yearly() ? m.pricing_per_year() : m.pricing_per_month());
	return (
		<div class="space-y-10">
			<div class="flex justify-start">
				<div class="inline-grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card">
					<button
						type="button"
						aria-pressed={!yearly() ? 'true' : 'false'}
						class={
							'min-h-11 min-w-28 px-4 text-sm font-medium ' +
							(!yearly() ? 'bg-foreground text-background' : 'hover:bg-accent')
						}
						onClick={() => props.setBillingCycle('monthly')}
					>
						{m.pricing_cycle_monthly()}
					</button>
					<button
						type="button"
						aria-pressed={yearly() ? 'true' : 'false'}
						class={
							'min-h-11 min-w-32 border-l border-border px-4 text-sm font-medium ' +
							(yearly() ? 'bg-foreground text-background' : 'hover:bg-accent')
						}
						onClick={() => props.setBillingCycle('yearly')}
					>
						{m.pricing_cycle_yearly()}
						<span class="ml-2 font-mono text-[10px]">
							{m.pricing_save_percent({ percent: props.pricing.discountPercent })}
						</span>
					</button>
				</div>
			</div>
			<div class="overflow-hidden rounded-lg border border-border bg-card">
				<div class="grid md:grid-cols-2">
					<section class="flex min-w-0 flex-col border-b border-border p-6 sm:p-8 md:border-r md:border-b-0">
						<div class="md:min-h-32">
							<div class="flex items-start justify-between gap-5">
								<div>
									<p class="font-display text-2xl font-semibold">
										{m.plan_free_name()}
									</p>
									<p class="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
										{m.plan_free_description()}
									</p>
								</div>
								<p class="font-mono text-xs text-muted-foreground">
									{m.plan_free_name()}
								</p>
							</div>
						</div>
						<div class="flex flex-col justify-start pt-5 md:min-h-48">
							<div class="flex items-end gap-2">
								<span class="font-display text-5xl font-semibold">
									{formatCurrency(0, props.pricing.currency, true)}
								</span>
								<span class="pb-1 text-sm text-muted-foreground">
									{m.pricing_forever()}
								</span>
							</div>
						</div>
						<a
							href="/signup"
							class="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md border border-foreground/30 font-medium hover:bg-accent md:mt-0"
						>
							{m.cta_get_started()}
						</a>
						<p class="mt-3 min-h-10 text-xs text-muted-foreground">
							{m.pricing_free_note()}
						</p>
					</section>
					<section class="relative flex min-w-0 flex-col p-6 sm:p-8">
						<div class="absolute inset-x-0 top-0 h-1 bg-signal" aria-hidden="true" />
						<div class="md:min-h-32">
							<div class="flex items-start justify-between gap-5">
								<div>
									<p class="font-display text-2xl font-semibold">
										{m.plan_pro_name()}
									</p>
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
							<Show when={yearly()}>
								<p class="text-sm text-muted-foreground">
									<span class="font-mono text-lg font-semibold text-foreground/75 line-through decoration-2">
										{props.pricing.yearlyStrikethrough}
									</span>
									<span class="ml-2">
										{m.pricing_monthly_annual_equivalent()}
									</span>
								</p>
							</Show>
							<div class="mt-1 flex items-end gap-2">
								<span class="font-display text-5xl font-semibold tracking-tight">
									{billedPrice()}
								</span>
								<span class="pb-1 text-sm text-muted-foreground">{period()}</span>
							</div>
							<Show when={yearly()}>
								<p class="mt-2 text-sm font-medium text-signal-deep dark:text-signal">
									{m.pricing_save_amount({
										amount: props.pricing.yearlySavings,
										percent: props.pricing.discountPercent
									})}
								</p>
							</Show>
						</div>
						<button
							type="button"
							class="ace-signal-action mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 font-semibold md:mt-0"
							onClick={props.onUpgrade}
						>
							{trialDays() === 14
								? m.pricing_start_trial()
								: m.pricing_get_pro_action()}
						</button>
						<p class="mt-3 min-h-10 text-xs leading-relaxed text-muted-foreground">
							{trialDays() === 14
								? m.pricing_trial_terms({ price: billedPrice(), period: period() })
								: m.pricing_recurring_terms({
										price: billedPrice(),
										period: period()
									})}
							{m.pricing_tax_checkout_note()}
						</p>
					</section>
				</div>
				<div class="border-t border-border">
					<div class="border-b border-border px-5 py-5 sm:px-8">
						<h2 class="font-display text-2xl font-semibold">
							{m.pricing_compare_title()}
						</h2>
					</div>
					<div class="overflow-x-auto">
						<table class="w-full table-fixed border-collapse text-left text-xs sm:text-sm">
							<colgroup>
								<col class="w-[40%]" />
								<col class="w-[30%]" />
								<col class="w-[30%]" />
							</colgroup>
							<thead>
								<tr class="bg-muted/60">
									<th scope="col" class="px-3 py-3 font-semibold sm:px-8 sm:py-4">
										{m.pricing_feature()}
									</th>
									<th
										scope="col"
										class="border-l border-border px-3 py-3 font-semibold sm:px-5 sm:py-4"
									>
										{m.pricing_basic()}
									</th>
									<th
										scope="col"
										class="border-l border-border bg-signal/10 px-3 py-3 font-semibold sm:px-5 sm:py-4"
									>
										{m.pricing_pro()}
									</th>
								</tr>
							</thead>
							<tbody>
								<For each={comparisonRows}>
									{(row) => (
										<tr class="border-t border-border">
											<th
												scope="row"
												class="px-3 py-3 font-medium sm:px-8 sm:py-4"
											>
												{row.label()}
											</th>
											<td class="border-l border-border px-3 py-3 text-muted-foreground sm:px-5 sm:py-4">
												<Show when={row.available} fallback={row.basic?.()}>
													<Minus class="size-4" />
													<span class="sr-only">
														{m.pricing_not_included()}
													</span>
												</Show>
											</td>
											<td class="border-l border-border bg-signal/[0.045] px-3 py-3 font-medium sm:px-5 sm:py-4">
												<Show when={row.available} fallback={row.pro?.()}>
													<Check class="size-4 text-signal-deep dark:text-signal" />
													<span class="sr-only">
														{m.pricing_included()}
													</span>
												</Show>
											</td>
										</tr>
									)}
								</For>
							</tbody>
						</table>
					</div>
				</div>
			</div>
		</div>
	);
}
