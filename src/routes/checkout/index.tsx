import { createSignal, createMemo, onSettled, Show, Loading } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { localizeHref } from '$lib/paraglide/runtime';
import { Title, Meta } from '@solidjs/meta';
import { ShieldCheck, RefreshCw } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import {
	formatCurrency,
	SUPPORTED_CURRENCIES,
	type SupportedCurrency
} from '$lib/utils/locale-currency';
import type { CheckoutBreakdownData, CheckoutEvent } from 'dodopayments-checkout';
import { getCheckoutData } from './data';
// Shared branding is being converted separately; no Svelte component can be mounted in Solid JSX.
import BrandLogo from '$lib/components/BrandLogo';

type CheckoutInfo = Awaited<ReturnType<typeof getCheckoutData>>;
type Breakdown = Partial<CheckoutBreakdownData>;
const money = (amount: number | undefined, currency: string) =>
	amount == null || !SUPPORTED_CURRENCIES.includes(currency as SupportedCurrency)
		? '—'
		: formatCurrency(amount, currency as SupportedCurrency);
function Summary(props: { data: CheckoutInfo; breakdown: () => Breakdown; mobile?: boolean }) {
	const hasTrial = () => props.data.trialDays > 0;
	const currency = () => props.breakdown().finalTotalCurrency ?? props.data.currency;
	const mismatch = () =>
		(props.breakdown().currency != null &&
			props.breakdown().currency !== props.data.currency) ||
		(props.breakdown().finalTotalCurrency != null &&
			props.breakdown().finalTotalCurrency !== props.data.currency);
	const dueToday = () => props.breakdown().finalTotal ?? props.data.dueTodayMinor;
	const trialTitle = () =>
		hasTrial()
			? props.data.trialDays === 1
				? m.inline_checkout_after_trial_one()
				: m.inline_checkout_after_trial({ days: props.data.trialDays })
			: m.inline_checkout_recurring_price();
	const recurring = () =>
		mismatch() ? '—' : money(props.data.recurringPriceMinor, props.data.currency);
	const renewal = () =>
		props.data.cycle === 'yearly'
			? m.inline_checkout_auto_renew_yearly()
			: m.inline_checkout_auto_renew_monthly();
	return (
		<div
			id={props.mobile ? 'checkout-mobile-summary' : undefined}
			class={
				props.mobile
					? 'mb-5 border border-t-[3px] border-border border-t-signal bg-card px-4 py-4 lg:hidden'
					: 'border-t-[3px] border-signal'
			}
			role="region"
			aria-label={m.inline_checkout_summary()}
		>
			<Show when={!props.mobile}>
				<div class="px-5 py-5 sm:px-6">
					<p class="font-mono text-[.7rem] font-medium tracking-[.15em] text-muted-foreground uppercase">
						{m.inline_checkout_plan_label()}
					</p>
					<h2 class="mt-2 font-display text-xl font-semibold sm:text-2xl">
						{m.inline_checkout_summary()}
					</h2>
					<p class="mt-2 text-sm font-medium">
						{m.site_brand_name()} {m.plan_pro_name()}
						<span class="text-muted-foreground">
							{' '}
							—{' '}
							{props.data.cycle === 'yearly'
								? m.pricing_cycle_yearly()
								: m.pricing_cycle_monthly()}
						</span>
					</p>
					<Show when={hasTrial()}>
						<span class="mt-3 inline-flex border border-signal/30 bg-signal/10 px-2.5 py-1 font-mono text-xs font-semibold text-[#946000] dark:text-signal">
							{props.data.trialDays === 1
								? m.inline_checkout_trial_badge_one()
								: m.inline_checkout_trial_badge({ days: props.data.trialDays })}
						</span>
					</Show>
				</div>
			</Show>
			<Show when={props.mobile}>
				<div class="flex items-center justify-between gap-3 text-xs text-muted-foreground">
					<span class="font-medium text-foreground">
						{m.site_brand_name()} {m.plan_pro_name()}
					</span>
					<span>
						{props.data.cycle === 'yearly'
							? m.pricing_cycle_yearly()
							: m.pricing_cycle_monthly()}
					</span>
				</div>
			</Show>
			<div
				class={
					'grid grid-cols-2 ' +
					(props.mobile
						? 'mt-3 gap-4 border-t border-border pt-3'
						: 'border-t border-border')
				}
			>
				<div class={props.mobile ? '' : 'min-w-0 border-r border-border px-4 py-5 sm:px-6'}>
					<p class="text-xs text-muted-foreground">{m.inline_checkout_due_today()}</p>
					<p
						class={
							'mt-2 font-display font-semibold tabular-nums ' +
							(props.mobile ? 'text-2xl' : 'text-3xl sm:text-4xl')
						}
					>
						{money(dueToday(), currency())}
					</p>
				</div>
				<div class={props.mobile ? '' : 'min-w-0 px-4 py-5 sm:px-6'}>
					<p class="text-xs text-muted-foreground">{trialTitle()}</p>
					<p
						class={
							'mt-2 font-display font-semibold tabular-nums ' +
							(props.mobile ? 'text-2xl' : 'text-2xl sm:text-3xl')
						}
					>
						{recurring()}
					</p>
					<p class="mt-1 text-xs text-muted-foreground">
						{props.data.cycle === 'yearly'
							? m.pricing_per_year()
							: m.pricing_per_month()}
					</p>
				</div>
			</div>
			<div
				class={
					props.mobile
						? 'mt-3 border-t border-border pt-3'
						: 'border-t border-border px-5 py-5 sm:px-6'
				}
			>
				<p class="flex items-start gap-2 text-sm leading-relaxed">
					<Show when={!props.mobile}>
						<RefreshCw class="mt-0.5 size-4 shrink-0 text-signal-deep dark:text-signal" />
					</Show>
					{renewal()}
				</p>
				<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
					{m.inline_checkout_tax_included_note()}
				</p>
				<Show when={mismatch()}>
					<p role="alert" class="mt-3 text-sm text-danger">
						{m.inline_checkout_currency_mismatch()}
					</p>
				</Show>
			</div>
		</div>
	);
}
function CheckoutContent(props: { data: CheckoutInfo; search: string }) {
	const [breakdown, setBreakdown] = createSignal<Breakdown>({});
	const [ready, setReady] = createSignal(false);
	const [loadError, setLoadError] = createSignal(false);
	const [expired, setExpired] = createSignal(false);
	const hasTrial = () => props.data.trialDays > 0;
	const title = createMemo(() =>
		hasTrial()
			? props.data.trialDays === 1
				? m.inline_checkout_trial_title_one()
				: m.inline_checkout_trial_title({ days: props.data.trialDays })
			: m.inline_checkout_title()
	);
	const planReturn = () => {
		const params = new URLSearchParams({
			cycle: props.data.cycle,
			currency: props.data.currency
		});
		const request = new URLSearchParams(props.search);
		const origin = request.get('origin'),
			enginePort = request.get('engine_port');
		if (origin === 'ace-engine' || origin === 'aceblocker') params.set('origin', origin);
		if (enginePort && /^\d{1,5}$/.test(enginePort)) params.set('engine_port', enginePort);
		return localizeHref('/get-pro') + '?' + params;
	};
	onSettled(() => {
		const params = new URLSearchParams(props.search);
		const requestedTheme = params.get('theme');
		if (requestedTheme === 'dark' || requestedTheme === 'light')
			document.documentElement.classList.toggle('dark', requestedTheme === 'dark');
		let active = true;
		let close: (() => void) | undefined;
		const container = document.getElementById('dodo-inline-checkout');
		// Cross-origin payment fields must stay in Dodo's iframe.
		const observer = new MutationObserver(() => {
			if (active && container?.querySelector('iframe')) setReady(true);
		});
		if (container) observer.observe(container, { childList: true, subtree: true });
		void import('dodopayments-checkout')
			.then(({ DodoPayments }) => {
				if (!active) return;
				close = () => DodoPayments.Checkout.close();
				DodoPayments.Initialize({
					mode: 'test',
					displayType: 'inline',
					onEvent: (event: CheckoutEvent) => {
						if (!active) return;
						if (
							[
								'checkout.opened',
								'checkout.form_ready',
								'checkout.breakdown'
							].includes(event.event_type)
						) {
							setReady(true);
							setLoadError(false);
						}
						if (event.event_type === 'checkout.breakdown')
							setBreakdown((event.data?.message as Breakdown) ?? {});
						if (event.event_type === 'checkout.link_expired') {
							setExpired(true);
							setLoadError(true);
						} else if (event.event_type === 'checkout.error' && !ready())
							setLoadError(true);
					}
				});
				DodoPayments.Checkout.open({
					checkoutUrl: props.data.checkoutUrl,
					elementId: 'dodo-inline-checkout',
					options: { showTimer: true, showSecurityBadge: true, fontSize: 'lg' }
				});
			})
			.catch(() => {
				if (active) setLoadError(true);
			});
		return () => {
			active = false;
			observer.disconnect();
			close?.();
		};
	});
	return (
		<>
			<Title>{title()}</Title>
			<Meta name="robots" content="noindex, nofollow" />
			<a
				href="#main-content"
				class="sr-only fixed top-3 left-3 z-[100] bg-foreground px-4 py-3 font-medium text-background focus:not-sr-only"
			>
				{m.skip_to_content()}
			</a>
			<header class="border-b border-border bg-background">
				<div class="ace-shell flex min-h-16 items-center justify-between gap-4 py-3">
					<a href="/" class="shrink-0" aria-label={m.site_brand_name()}>
						<BrandLogo alt="" class="h-10 w-auto sm:h-12" />
					</a>
					<a
						href={planReturn()}
						class="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-foreground underline-offset-4 hover:underline"
					>
						<span aria-hidden="true">←</span>
						{m.inline_checkout_back()}
					</a>
				</div>
			</header>
			<main id="main-content" class="ace-shell pt-8 pb-14 sm:pt-11 sm:pb-20">
				<div class="mb-7 flex flex-col gap-5 border-b border-border pb-7 sm:mb-9 sm:pb-9 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p class="mb-4 inline-flex items-center gap-3 font-mono text-[.7rem] font-medium tracking-[.16em] text-muted-foreground uppercase">
							<span class="size-2 bg-signal" />
							{m.inline_checkout_eyebrow()}
						</p>
						<h1 class="font-display text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
							{title()}
						</h1>
						<p class="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
							{m.inline_checkout_description()}
						</p>
					</div>
					<p class="inline-flex shrink-0 items-center gap-2 font-mono text-xs text-muted-foreground">
						<ShieldCheck class="size-4 text-signal-deep dark:text-signal" />
						{m.inline_checkout_secure_note()}
					</p>
				</div>
				<Summary data={props.data} breakdown={breakdown} mobile />
				<div class="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(19rem,0.85fr)] lg:gap-7">
					<section
						class="order-1 min-w-0 border border-border bg-card"
						aria-label={m.inline_checkout_secure_form()}
					>
						<div class="flex items-center justify-between gap-5 border-b border-border px-5 py-5 sm:px-7">
							<div>
								<p class="mb-1 font-mono text-[.7rem] font-medium tracking-[.15em] text-signal-deep uppercase dark:text-signal">
									{m.inline_checkout_payment_step()}
								</p>
								<h2 class="font-display text-xl font-semibold sm:text-2xl">
									{m.inline_checkout_payment_details()}
								</h2>
							</div>
							<ShieldCheck class="size-6 shrink-0 text-muted-foreground" />
						</div>
						<div
							class={
								'relative bg-background p-1.5 sm:p-3 ' +
								(!ready() ? 'min-h-[28rem]' : '')
							}
						>
							<Show when={!ready() && !loadError()}>
								<div
									class="pointer-events-none absolute inset-0 flex items-start justify-center px-4 pt-14"
									role="status"
								>
									<p class="text-center text-sm text-muted-foreground">
										{m.inline_checkout_loading()}
									</p>
								</div>
							</Show>
							<Show when={loadError()}>
								<div
									class="relative z-10 border-l-2 border-danger bg-background px-4 py-4"
									role="alert"
								>
									<p class="text-sm">
										{expired()
											? m.inline_checkout_expired()
											: m.inline_checkout_error()}
									</p>
									<button
										type="button"
										class="mt-4 min-h-11 border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
										onClick={() => window.location.reload()}
									>
										{m.inline_checkout_retry()}
									</button>
								</div>
							</Show>
							<div
								id="dodo-inline-checkout"
								class="relative w-full min-w-0"
								aria-label={m.inline_checkout_secure_form()}
							/>
						</div>
					</section>
					<aside
						class="order-2 hidden self-start border border-border bg-card lg:sticky lg:top-6 lg:block"
						aria-label={m.inline_checkout_summary()}
					>
						<Summary data={props.data} breakdown={breakdown} />
					</aside>
				</div>
			</main>
			<footer class="border-t border-border py-5">
				<nav
					class="ace-shell flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground"
					aria-label={m.footer_legal_navigation()}
				>
					<a
						href="/terms"
						class="underline-offset-4 hover:text-foreground hover:underline"
					>
						{m.footer_terms()}
					</a>
					<a
						href="/privacy"
						class="underline-offset-4 hover:text-foreground hover:underline"
					>
						{m.footer_privacy()}
					</a>
				</nav>
			</footer>
		</>
	);
}
export default function CheckoutPage() {
	const [started, setStarted] = createSignal(false);
	onSettled(() => {
		setStarted(true);
	});
	return (
		<Show
			when={started()}
			fallback={
				<main class="ace-shell py-16" aria-busy="true">
					{m.inline_checkout_loading()}
				</main>
			}
		>
			<Loading
				fallback={
					<main class="ace-shell py-16" aria-busy="true">
						{m.inline_checkout_loading()}
					</main>
				}
			>
				<CheckoutSession />
			</Loading>
		</Show>
	);
}
function CheckoutSession() {
	const location = useLocation();
	const data = createMemo(() => getCheckoutData(location.pathname + location.search));
	return (
		<Show when={data()}>
			{(value) => <CheckoutContent data={value()} search={location.search} />}
		</Show>
	);
}
