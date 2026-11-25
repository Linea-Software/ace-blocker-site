import { createMemo, createSignal, For, onSettled, Show } from 'solid-js';
import { useLocation, useSearchParams } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { Check } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { apiClient } from '$lib/api-client';
import { canonicalUrl } from '$lib/seo';
import { localizeHref } from '$lib/paraglide/runtime';
import { linkEngine } from '$lib/utils';
import { browserCurrencyHint } from '$lib/utils/locale-currency';
import { getPricingData } from './data';
import PricingSection from './_components/PricingSection';
import ProActivationPanel, { type ActivationStatus } from './_components/ProActivationPanel';
// Shared marketing components are ported by the parallel shared-components worker.
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import ResistanceDemo from '$lib/components/marketing/ResistanceDemo';
import SitePackVisual from '$lib/components/marketing/SitePackVisual';

const benefits = [
	m.pricing_all_packs,
	m.pricing_custom_packs,
	m.pricing_resistance,
	m.pricing_cloud_backup,
	m.pricing_network_blocks
];
export default function GetProPage() {
	const location = useLocation();
	const [params] = useSearchParams();
	const [browserHint, setBrowserHint] = createSignal('');
	onSettled(() => {
		const hint = browserCurrencyHint();
		if (hint !== 'USD') setBrowserHint(hint);
	});
	const data = createMemo(() =>
		getPricingData(typeof params.currency === 'string' ? params.currency : '', browserHint())
	);
	const [billingCycle, setBillingCycle] = createSignal<'monthly' | 'yearly'>(() =>
		params.cycle === 'monthly' ? 'monthly' : 'yearly'
	);
	const [status, setStatus] = createSignal<ActivationStatus>('idle');
	const origin = () => (typeof params.origin === 'string' ? params.origin : '');
	const enginePort = () => Number(params.engine_port) || 0;
	async function activate() {
		if (status() === 'loading') return;
		setStatus('loading');
		try {
			const result = await linkEngine(async () => {
				const { data: keyData, error: keyError } =
					await apiClient.v1.account['api-key'].create.get();
				if (keyError)
					throw new Error((keyError.value as string) || 'Failed to create API key');
				if (!keyData) throw new Error('Failed to create API key');
				return keyData.apiKey;
			});
			setStatus(result.status);
		} catch (error) {
			console.error('Linking error', error);
			setStatus('error');
		}
	}
	function upgrade() {
		const current = data();
		if (!current) return;
		const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
		const q = new URLSearchParams({
			cycle: billingCycle(),
			currency: current.pricing.currency,
			theme
		});
		if (origin()) q.set('origin', origin());
		if (enginePort()) q.set('engine_port', String(enginePort()));
		const checkout = localizeHref('/checkout') + '?' + q.toString();
		// The document guard makes the decision from the server session.
		// A pending browser session must never be mistaken for a signed-out user.
		window.location.assign(checkout);
	}
	return (
		<Show when={data()}>
			{(current) => (
				<>
					<Title>{m.page_title_get_pro()}</Title>
					<Meta name="description" content={m.page_description_get_pro()} />
					<Meta property="og:title" content={m.page_title_get_pro()} />
					<Meta property="og:description" content={m.page_description_get_pro()} />
					<Meta property="og:url" content={canonicalUrl(location.pathname)} />
					<Meta name="twitter:title" content={m.page_title_get_pro()} />
					<Meta name="twitter:description" content={m.page_description_get_pro()} />
					<Navbar isPro={current().isPro} />
					<main id="main-content">
						<section class="border-b border-border">
							<div class="ace-shell py-12 sm:py-16">
								<Show
									when={current().isPro}
									fallback={
										<div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
											<div>
												<p class="font-mono text-xs text-muted-foreground">
													{m.site_brand_name()} / {m.plan_pro_name()}
												</p>
												<h1 class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl">
													{m.pro_title()}
												</h1>
											</div>
											<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:pb-1">
												{m.pricing_compare_description()}
											</p>
										</div>
									}
								>
									<ProActivationPanel
										status={status}
										onActivate={() => void activate()}
									/>
								</Show>
							</div>
						</section>
						<Show
							when={!current().isPro}
							fallback={
								<section
									class="border-b border-border bg-background py-12 sm:py-16"
									aria-labelledby="pro-features-title"
								>
									<div class="ace-shell grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-start">
										<div class="max-w-lg">
											<p class="font-mono text-xs text-signal-deep dark:text-signal">
												{m.site_brand_name()} / {m.plan_pro_name()}
											</p>
											<h2
												id="pro-features-title"
												class="mt-3 font-display text-3xl font-semibold"
											>
												{m.nav_pro_features()}
											</h2>
											<p class="mt-3 leading-relaxed text-muted-foreground">
												{m.plan_pro_description()}
											</p>
										</div>
										<ul
											class="grid gap-x-6 sm:grid-cols-2"
											data-testid="active-pro-features"
										>
											<For each={benefits}>
												{(benefit) => (
													<li class="flex min-h-14 items-center gap-3 border-t border-border py-3 text-sm font-medium">
														<Check class="size-4 shrink-0 text-signal-deep dark:text-signal" />
														<span>{benefit()}</span>
													</li>
												)}
											</For>
										</ul>
									</div>
								</section>
							}
						>
							<section class="border-b border-border bg-background py-12 sm:py-16">
								<div class="ace-shell">
									<PricingSection
										pricing={current().pricing}
										billingCycle={billingCycle}
										setBillingCycle={setBillingCycle}
										onUpgrade={upgrade}
									/>
								</div>
							</section>
						</Show>
						<section class="border-b border-border bg-card py-14 sm:py-20">
							<div class="ace-shell grid gap-12 lg:grid-cols-2">
								<div>
									<h2 class="font-display text-3xl font-semibold">
										{m.about_resistance_title()}
									</h2>
									<p class="mt-3 max-w-lg leading-relaxed text-muted-foreground">
										{m.pricing_resistance_description()}
									</p>
									<div class="mt-7">
										<ResistanceDemo compact />
										<a
											href={localizeHref('/features/resistance') as string}
											class="mt-4 inline-block text-sm font-semibold underline underline-offset-4"
										>
											{m.feature_explore_resistance()}
										</a>
									</div>
								</div>
								<div>
									<h2 class="font-display text-3xl font-semibold">
										{m.about_packs_title()}
									</h2>
									<p class="mt-3 max-w-lg leading-relaxed text-muted-foreground">
										{m.pricing_categories_description()}
									</p>
									<div class="mt-7">
										<SitePackVisual />
									</div>
								</div>
							</div>
						</section>
					</main>
					<MarketingFooter />
				</>
			)}
		</Show>
	);
}
