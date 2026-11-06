<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { ShieldCheck, RefreshCw } from '@lucide/svelte';
	import { setMode } from 'mode-watcher';
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
	const checkoutTitle = $derived(
		hasTrial
			? data.trialDays === 1
				? m.inline_checkout_trial_title_one()
				: m.inline_checkout_trial_title({ days: data.trialDays })
			: m.inline_checkout_title()
	);
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
		const requestedTheme = page.url.searchParams.get('theme');
		if (requestedTheme === 'dark' || requestedTheme === 'light') setMode(requestedTheme);
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
					options: { showTimer: true, showSecurityBadge: true, fontSize: 'lg' }
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
	<title>{checkoutTitle}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<a
	href="#main-content"
	class="sr-only fixed top-3 left-3 z-[100] bg-foreground px-4 py-3 font-medium text-background focus:not-sr-only"
>
	{m.skip_to_content()}
</a>
<header class="border-b border-border bg-background">
	<div class="ace-shell flex min-h-16 items-center justify-between gap-4 py-3">
		<a href={resolve('/')} class="shrink-0" aria-label={m.site_brand_name()}>
			<BrandLogo alt="" class="h-10 w-auto sm:h-12" />
		</a>
		<a
			href={planReturn}
			class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
		>
			<span aria-hidden="true">←</span>
			{m.inline_checkout_back()}
		</a>
	</div>
</header>

<main id="main-content" class="ace-shell pt-8 pb-14 sm:pt-11 sm:pb-20">
	<div
		class="mb-7 flex flex-col gap-5 border-b border-border pb-7 sm:mb-9 sm:pb-9 lg:flex-row lg:items-end lg:justify-between"
	>
		<div>
			<p
				class="mb-4 inline-flex items-center gap-3 font-mono text-[0.7rem] font-medium tracking-[0.16em] text-muted-foreground uppercase"
			>
				<span class="size-2 bg-signal" aria-hidden="true"></span>
				{m.inline_checkout_eyebrow()}
			</p>
			<h1
				class="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl"
			>
				{checkoutTitle}
			</h1>
			<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
				{m.inline_checkout_description()}
			</p>
		</div>
		<p class="inline-flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
			<ShieldCheck class="size-4 text-signal-deep dark:text-signal" aria-hidden="true" />
			{m.inline_checkout_secure_note()}
		</p>
	</div>

	<div
		id="checkout-mobile-summary"
		class="mb-5 border border-t-[3px] border-border border-t-signal bg-card px-4 py-4 lg:hidden"
		role="region"
		aria-label={m.inline_checkout_summary()}
	>
		<div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
			<span class="font-medium text-foreground"
				>{m.site_brand_name()} {m.plan_pro_name()}</span
			>
			<span
				>{data.cycle === 'yearly'
					? m.pricing_cycle_yearly()
					: m.pricing_cycle_monthly()}</span
			>
		</div>
		<div class="mt-3 grid grid-cols-2 gap-4 border-t border-border pt-3">
			<div>
				<p class="text-xs text-muted-foreground">{m.inline_checkout_due_today()}</p>
				<p class="mt-1 font-display text-2xl font-semibold tabular-nums">
					{money(dueToday, totalCurrency)}
				</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">
					{hasTrial
						? data.trialDays === 1
							? m.inline_checkout_after_trial_one()
							: m.inline_checkout_after_trial({ days: data.trialDays })
						: m.inline_checkout_recurring_price()}
				</p>
				<p class="mt-1 font-display text-2xl font-semibold tabular-nums">
					{currencyMismatch ? '—' : money(data.recurringPriceMinor, data.currency)}
				</p>
				<p class="text-xs text-muted-foreground">
					{data.cycle === 'yearly' ? m.pricing_per_year() : m.pricing_per_month()}
				</p>
			</div>
		</div>
		<p class="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
			{data.cycle === 'yearly'
				? m.inline_checkout_auto_renew_yearly()
				: m.inline_checkout_auto_renew_monthly()}
			{m.inline_checkout_tax_included_note()}
		</p>
		{#if currencyMismatch}
			<p class="mt-2 text-xs text-danger" role="alert">
				{m.inline_checkout_currency_mismatch()}
			</p>
		{/if}
	</div>

	<div
		class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)] lg:gap-7"
	>
		<section
			class="order-1 min-w-0 border border-border bg-card"
			aria-label={m.inline_checkout_secure_form()}
		>
			<div
				class="flex items-center justify-between gap-5 border-b border-border px-5 py-5 sm:px-7"
			>
				<div>
					<p
						class="mb-1 font-mono text-[0.7rem] font-medium tracking-[0.15em] text-signal-deep uppercase dark:text-signal"
					>
						{m.inline_checkout_payment_step()}
					</p>
					<h2 class="font-display text-xl font-semibold sm:text-2xl">
						{m.inline_checkout_payment_details()}
					</h2>
				</div>
				<ShieldCheck class="size-6 shrink-0 text-muted-foreground" aria-hidden="true" />
			</div>
			<!-- Dodo owns the cross-origin fields, legal content, and final tax calculation. -->
			<div class={['relative bg-background p-1.5 sm:p-3', !ready && 'min-h-[28rem]']}>
				{#if !ready && !loadError}
					<div
						class="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-14"
						role="status"
					>
						<p class="text-center text-sm text-muted-foreground">
							{m.inline_checkout_loading()}
						</p>
					</div>
				{/if}
				{#if loadError}
					<div
						class="relative z-10 border-l-2 border-danger bg-background px-4 py-4"
						role="alert"
					>
						<p class="text-sm">
							{expired ? m.inline_checkout_expired() : m.inline_checkout_error()}
						</p>
						<button
							type="button"
							class="mt-4 min-h-11 border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
							onclick={() => window.location.reload()}
						>
							{m.inline_checkout_retry()}
						</button>
					</div>
				{/if}
				<div
					id="dodo-inline-checkout"
					class="relative w-full min-w-0"
					aria-label={m.inline_checkout_secure_form()}
				></div>
			</div>
		</section>

		<aside
			class="order-2 hidden self-start border border-border bg-card lg:sticky lg:top-6 lg:block"
			aria-label={m.inline_checkout_summary()}
		>
			<div class="border-t-[3px] border-signal px-5 py-5 sm:px-6">
				<p
					class="font-mono text-[0.7rem] font-medium tracking-[0.15em] text-muted-foreground uppercase"
				>
					{m.inline_checkout_plan_label()}
				</p>
				<h2 class="mt-2 font-display text-xl font-semibold sm:text-2xl">
					{m.inline_checkout_summary()}
				</h2>
				<p class="mt-2 text-sm font-medium">
					{m.site_brand_name()}
					{m.plan_pro_name()}
					<span class="text-muted-foreground">
						— {data.cycle === 'yearly'
							? m.pricing_cycle_yearly()
							: m.pricing_cycle_monthly()}
					</span>
				</p>
				{#if hasTrial}
					<p
						class="mt-3 inline-flex border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#946000] dark:text-signal"
					>
						{data.trialDays === 1
							? m.inline_checkout_trial_badge_one()
							: m.inline_checkout_trial_badge({ days: data.trialDays })}
					</p>
				{/if}
			</div>

			<dl class="grid grid-cols-2 border-t border-border" aria-live="polite">
				<div class="min-w-0 border-r border-border px-4 py-5 sm:px-6">
					<dt class="text-xs text-muted-foreground">{m.inline_checkout_due_today()}</dt>
					<dd
						class="mt-2 font-display text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl"
					>
						{money(dueToday, totalCurrency)}
					</dd>
				</div>
				<div class="min-w-0 px-4 py-5 sm:px-6">
					<dt class="text-xs text-muted-foreground">
						{hasTrial
							? data.trialDays === 1
								? m.inline_checkout_after_trial_one()
								: m.inline_checkout_after_trial({ days: data.trialDays })
							: m.inline_checkout_recurring_price()}
					</dt>
					<dd
						class="mt-2 font-display text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl"
					>
						{currencyMismatch ? '—' : money(data.recurringPriceMinor, data.currency)}
					</dd>
					<dd class="mt-1 text-xs text-muted-foreground">
						{data.cycle === 'yearly' ? m.pricing_per_year() : m.pricing_per_month()}
					</dd>
				</div>
			</dl>

			<div class="border-t border-border px-5 py-5 sm:px-6">
				<p class="flex items-start gap-2.5 text-sm leading-relaxed text-foreground">
					<RefreshCw
						class="mt-0.5 size-4 shrink-0 text-signal-deep dark:text-signal"
						aria-hidden="true"
					/>
					<span>
						{data.cycle === 'yearly'
							? m.inline_checkout_auto_renew_yearly()
							: m.inline_checkout_auto_renew_monthly()}
					</span>
				</p>
				<p class="mt-3 text-xs leading-relaxed text-muted-foreground">
					{m.inline_checkout_tax_included_note()}
				</p>
				{#if currencyMismatch}
					<p class="mt-4 text-sm text-danger" role="alert">
						{m.inline_checkout_currency_mismatch()}
					</p>
				{/if}
			</div>
		</aside>
	</div>
</main>

<footer class="border-t border-border py-5">
	<nav
		class="ace-shell flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"
		aria-label={m.footer_legal_navigation()}
	>
		<a
			href={resolve('/terms')}
			class="underline-offset-4 hover:text-foreground hover:underline"
		>
			{m.footer_terms()}
		</a>
		<a
			href={resolve('/privacy')}
			class="underline-offset-4 hover:text-foreground hover:underline"
		>
			{m.footer_privacy()}
		</a>
	</nav>
</footer>
