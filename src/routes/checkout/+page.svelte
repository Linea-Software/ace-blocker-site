<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
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
			? m.inline_checkout_trial_title({ days: data.trialDays })
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
		<a href={resolve('/')} class="shrink-0" aria-label={m.about_hero_app()}>
			<BrandLogo alt="" class="h-7 w-auto sm:h-8" />
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

<main id="main-content" class="ace-shell pt-8 pb-14 sm:pt-12">
	<div class="mb-7 max-w-2xl sm:mb-9">
		<h1 class="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
			{checkoutTitle}
		</h1>
		<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
			{m.inline_checkout_description()}
		</p>
	</div>

	<div
		class="grid items-start gap-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.75fr)] lg:gap-10"
	>
		<section class="order-2 min-w-0 lg:order-1" aria-label={m.inline_checkout_secure_form()}>
			<div class="border border-border bg-card p-2 sm:p-3">
				<h2 class="border-b border-border px-1 pb-4 font-display text-xl font-semibold">
					{m.inline_checkout_payment_details()}
				</h2>
				<!-- Dodo owns the iframe's fields, legal content, and final tax calculation. -->
				<div
					class={[
						'relative mt-3 border border-border bg-background p-2 sm:p-3',
						!ready && 'min-h-[28rem]'
					]}
				>
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
							class="relative z-10 border-l-2 border-danger bg-background pl-4"
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
			</div>
		</section>

		<aside
			class="order-1 self-start border-y border-border bg-card px-5 py-6 sm:border sm:px-7 lg:sticky lg:top-6 lg:order-2"
			aria-label={m.inline_checkout_summary()}
		>
			<h2 class="font-display text-xl font-semibold">{m.inline_checkout_summary()}</h2>
			<p class="mt-3 text-sm font-medium">
				{m.about_hero_app()}
				{m.plan_pro_name()}
				<span class="text-muted-foreground">
					— {data.cycle === 'yearly'
						? m.pricing_cycle_yearly()
						: m.pricing_cycle_monthly()}
				</span>
			</p>
			{#if hasTrial}
				<p class="mt-3 text-sm font-semibold text-[#946000] dark:text-signal">
					{m.inline_checkout_trial_badge({ days: data.trialDays })}
				</p>
			{/if}
			<dl class="mt-5 border-t border-border pt-5" aria-live="polite">
				<div>
					<dt class="text-sm text-muted-foreground">{m.inline_checkout_due_today()}</dt>
					<dd
						class="mt-1 font-display text-4xl font-semibold tracking-tight tabular-nums"
					>
						{money(dueToday, totalCurrency)}
					</dd>
				</div>
				<div class="mt-5 border-t border-border pt-5">
					<dt class="text-sm text-muted-foreground">
						{hasTrial
							? m.inline_checkout_after_trial({ days: data.trialDays })
							: m.inline_checkout_recurring_price()}
					</dt>
					<dd
						class="mt-1 font-display text-2xl font-semibold tracking-tight tabular-nums"
					>
						{currencyMismatch ? '—' : money(data.recurringPriceMinor, data.currency)}
						<span class="font-sans text-sm font-normal text-muted-foreground">
							{data.cycle === 'yearly' ? m.pricing_per_year() : m.pricing_per_month()}
						</span>
					</dd>
				</div>
			</dl>
			<p class="mt-5 text-sm leading-relaxed text-foreground">
				{data.cycle === 'yearly'
					? m.inline_checkout_auto_renew_yearly()
					: m.inline_checkout_auto_renew_monthly()}
			</p>
			<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
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
