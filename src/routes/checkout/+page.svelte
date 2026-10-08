<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import * as m from '$lib/paraglide/messages';
	import type { CheckoutBreakdownData } from 'dodopayments-checkout';
	import {
		formatCurrency,
		SUPPORTED_CURRENCIES,
		type SupportedCurrency
	} from '$lib/utils/locale-currency';

	let { data } = $props();
	let breakdown = $state<Partial<CheckoutBreakdownData>>({});
	let ready = $state(false);
	let loadError = $state(false);
	let expired = $state(false);

	function money(amount: number | undefined, currency: string): string {
		if (amount == null || !SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency))
			return '—';
		return formatCurrency(amount, currency as SupportedCurrency);
	}

	const totalCurrency = $derived(breakdown.finalTotalCurrency ?? data.currency);
	const hasTrial = $derived(data.trialDays > 0);
	const currencyMismatch = $derived(
		(breakdown.currency != null && breakdown.currency !== data.currency) ||
			(breakdown.finalTotalCurrency != null && breakdown.finalTotalCurrency !== data.currency)
	);
	const dueToday = $derived(breakdown.finalTotal ?? data.dueTodayMinor);
	const planReturn = $derived.by(() => {
		const params = new URLSearchParams({ cycle: data.cycle, currency: data.currency });
		const origin = page.url.searchParams.get('origin');
		const enginePort = page.url.searchParams.get('engine_port');
		if (origin === 'ace-engine' || origin === 'aceblocker') params.set('origin', origin);
		if (enginePort && /^\d{1,5}$/.test(enginePort)) params.set('engine_port', enginePort);
		return `${resolve('/get-pro')}?${params}`;
	});

	onMount(() => {
		let active = true;
		let close: (() => void) | undefined;
		const container = document.getElementById('dodo-inline-checkout');
		// The checkout can render before form_ready fires. Detect the actual frame
		// instead of declaring a working checkout broken after an arbitrary timeout.
		const observer = new MutationObserver(() => {
			if (active && container?.querySelector('iframe')) ready = true;
		});
		if (container) observer.observe(container, { childList: true, subtree: true });

		void import('dodopayments-checkout')
			.then(({ DodoPayments }) => {
				if (!active) return;
				close = () => DodoPayments.Checkout.close();
				DodoPayments.Initialize({
					mode: 'test',
					displayType: 'inline',
					onEvent: (event) => {
						if (!active) return;
						if (
							event.event_type === 'checkout.opened' ||
							event.event_type === 'checkout.form_ready' ||
							event.event_type === 'checkout.breakdown'
						) {
							ready = true;
							loadError = false;
						}
						if (event.event_type === 'checkout.breakdown') {
							breakdown = (event.data?.message as CheckoutBreakdownData) ?? {};
						}
						if (event.event_type === 'checkout.link_expired') {
							expired = true;
							loadError = true;
						} else if (event.event_type === 'checkout.error' && !ready) {
							// Payment errors after the form loads belong to the Dodo form.
							loadError = true;
						}
					}
				});
				DodoPayments.Checkout.open({
					checkoutUrl: data.checkoutUrl,
					elementId: 'dodo-inline-checkout',
					options: { showTimer: true, showSecurityBadge: true }
				});
			})
			.catch(() => {
				if (active) loadError = true;
			});
		return () => {
			active = false;
			observer.disconnect();
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
	<a
		href={planReturn}
		class="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
	>
		<span aria-hidden="true">←</span>
		{m.inline_checkout_back()}
	</a>
	<div
		class="mt-7 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)] lg:gap-16"
	>
		<section class="min-w-0">
			<h1 class="font-display text-4xl font-semibold tracking-tight">
				{m.inline_checkout_title()}
			</h1>
			<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
				{m.inline_checkout_description()}
			</p>

			{#if !ready && !loadError}
				<p class="mt-6 text-sm text-muted-foreground" role="status">
					{m.inline_checkout_loading()}
				</p>
			{/if}
			{#if loadError}
				<div class="mt-6 border-l-2 border-danger pl-4" role="alert">
					<p class="text-sm">
						{expired ? m.inline_checkout_expired() : m.inline_checkout_error()}
					</p>
					<button
						type="button"
						class="mt-3 min-h-10 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
						onclick={() => window.location.reload()}
					>
						{m.inline_checkout_retry()}
					</button>
				</div>
			{/if}
			<!-- The full Dodo frame, including its required footer, must stay visible. -->
			<div
				id="dodo-inline-checkout"
				class="mt-6 w-full min-w-0"
				aria-label={m.inline_checkout_secure_form()}
			></div>
		</section>
		<aside
			class="self-start border border-border bg-card p-6 sm:p-8 lg:sticky lg:top-24"
			aria-label={m.inline_checkout_summary()}
		>
			<h2 class="font-display text-2xl font-semibold">{m.inline_checkout_summary()}</h2>
			<div class="mt-6 border-y border-border py-5">
				<p class="font-semibold">
					{m.about_hero_app()}
					{m.plan_pro_name()}
					<span class="text-muted-foreground"
						>— {data.cycle === 'yearly'
							? m.pricing_cycle_yearly()
							: m.pricing_cycle_monthly()}</span
					>
				</p>
				{#if hasTrial}
					<p class="mt-4 font-medium text-signal-deep dark:text-signal">
						{m.inline_checkout_trial_badge({ days: data.trialDays })}
					</p>
				{/if}
			</div>
			<dl class="mt-6 space-y-6" aria-live="polite">
				<div>
					<dt class="text-sm text-muted-foreground">{m.inline_checkout_due_today()}</dt>
					<dd
						class="mt-1 font-display text-3xl font-semibold tracking-tight tabular-nums"
					>
						{money(dueToday, totalCurrency)}
					</dd>
				</div>
				<div class="border-t border-border pt-5">
					<dt class="text-sm text-muted-foreground">
						{hasTrial
							? m.inline_checkout_after_trial({ days: data.trialDays })
							: m.inline_checkout_recurring_price()}
					</dt>
					<dd
						class="mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums"
					>
						{currencyMismatch ? '—' : money(data.recurringPriceMinor, data.currency)}
						<span class="font-sans text-base font-normal text-muted-foreground">
							{data.cycle === 'yearly' ? m.pricing_per_year() : m.pricing_per_month()}
						</span>
					</dd>
				</div>
			</dl>
			<p class="mt-5 text-sm leading-relaxed text-muted-foreground">
				{data.cycle === 'yearly'
					? m.inline_checkout_auto_renew_yearly()
					: m.inline_checkout_auto_renew_monthly()}
			</p>
			<p class="mt-3 text-xs leading-relaxed text-muted-foreground">
				{m.inline_checkout_tax_included_note()}
			</p>
			{#if currencyMismatch}
				<p class="mt-4 text-sm text-danger" role="alert">
					{m.inline_checkout_currency_mismatch()}
				</p>
			{/if}
		</aside>
	</div>
</main>
<MarketingFooter />
