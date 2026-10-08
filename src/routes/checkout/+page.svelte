<script lang="ts">
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/components/Navbar.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { CheckoutBreakdownData } from 'dodopayments-checkout';

	let { data } = $props();
	let breakdown = $state<Partial<CheckoutBreakdownData>>({});
	let ready = $state(false);
	let failed = $state(false);

	function money(amount: number | undefined, currency: string): string {
		return amount == null
			? '—'
			: new Intl.NumberFormat(undefined, {
					style: 'currency',
					currency
				}).format(amount / 100);
	}
	const currency = $derived(breakdown.currency ?? data.currency);
	const totalCurrency = $derived(breakdown.finalTotalCurrency ?? currency);

	onMount(() => {
		let active = true;
		const timeout = window.setTimeout(() => {
			if (active && !ready) failed = true;
		}, 15000);
		let close: (() => void) | undefined;
		void import('dodopayments-checkout')
			.then(({ DodoPayments }) => {
				if (!active) return;
				close = () => DodoPayments.Checkout.close();
				DodoPayments.Initialize({
					mode: 'test',
					displayType: 'inline',
					onEvent: (event) => {
						if (!active) return;
						if (event.event_type === 'checkout.form_ready') {
							ready = true;
							failed = false;
							window.clearTimeout(timeout);
						}
						if (event.event_type === 'checkout.breakdown') {
							breakdown = (event.data?.message as CheckoutBreakdownData) ?? {};
						}
						if (
							event.event_type === 'checkout.error' ||
							event.event_type === 'checkout.link_expired'
						)
							failed = true;
					}
				});
				DodoPayments.Checkout.open({
					checkoutUrl: data.checkoutUrl,
					elementId: 'dodo-inline-checkout'
				});
			})
			.catch(() => {
				if (active) failed = true;
			});
		return () => {
			active = false;
			window.clearTimeout(timeout);
			close?.();
		};
	});
</script>

<svelte:head>
	<title>{m.inline_checkout_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<Navbar isPro={false} />
<main id="main-content" class="ace-shell py-10 sm:py-16">
	<a href={resolve('/get-pro')} class="text-sm text-muted-foreground underline underline-offset-4"
		>{m.inline_checkout_back()}</a
	>
	<div
		class="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:gap-16"
	>
		<section class="min-w-0">
			<p class="font-mono text-xs tracking-wider text-signal-deep uppercase dark:text-signal">
				{m.plan_pro_name()}
			</p>
			<h1 class="mt-3 font-display text-4xl font-semibold tracking-tight">
				{m.inline_checkout_title()}
			</h1>
			<p class="mt-3 text-muted-foreground">{m.inline_checkout_description()}</p>
			{#if !ready && !failed}<p class="mt-5 text-sm text-muted-foreground" role="status">
					{m.inline_checkout_loading()}
				</p>{/if}
			{#if failed}
				<p class="mt-5 text-sm text-danger" role="alert">{m.inline_checkout_error()}</p>
				<a
					class="mt-4 inline-flex min-h-11 items-center rounded-md bg-foreground px-5 font-medium text-background"
					href={data.checkoutUrl}>{m.inline_checkout_hosted()}</a
				>
			{/if}
			<!-- Preserve the complete Dodo iframe, including its legal footer. -->
			<div id="dodo-inline-checkout" class="mt-6 w-full min-w-0"></div>
		</section>
		<aside
			class="border border-border bg-card p-6 sm:p-8"
			aria-label={m.inline_checkout_summary()}
		>
			<h2 class="font-display text-2xl font-semibold">{m.inline_checkout_summary()}</h2>
			<div class="mt-6 border-y border-border py-5">
				<p class="font-medium">{m.plan_pro_name()}</p>
				<p class="mt-1 text-sm text-muted-foreground">
					{data.cycle === 'yearly' ? m.pricing_cycle_yearly() : m.pricing_cycle_monthly()}
				</p>
				<p class="mt-3 text-sm text-muted-foreground">{m.inline_checkout_renewal()}</p>
			</div>
			<dl class="mt-5 space-y-3 text-sm" aria-live="polite">
				<div class="flex justify-between gap-4">
					<dt>{m.inline_checkout_subtotal()}</dt>
					<dd class="font-mono">{money(breakdown.subTotal, currency)}</dd>
				</div>
				{#if breakdown.discount != null && breakdown.discount > 0}
					<div class="flex justify-between gap-4">
						<dt>{m.inline_checkout_discount()}</dt>
						<dd class="font-mono">−{money(breakdown.discount, currency)}</dd>
					</div>
				{/if}
				<div class="flex justify-between gap-4">
					<dt>{m.inline_checkout_tax()}</dt>
					<dd class="font-mono">{money(breakdown.tax, currency)}</dd>
				</div>
				<div
					class="flex justify-between gap-4 border-t border-border pt-4 text-base font-semibold"
				>
					<dt>{m.inline_checkout_total()}</dt>
					<dd class="font-mono">
						{money(breakdown.finalTotal ?? breakdown.total, totalCurrency)}
					</dd>
				</div>
			</dl>
			<p class="mt-5 text-xs leading-relaxed text-muted-foreground">
				{m.inline_checkout_total_note()}
			</p>
		</aside>
	</div>
</main>
