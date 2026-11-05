<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import ResistanceScale from '$lib/components/marketing/ResistanceScale.svelte';
	import SitePackVisual from '$lib/components/marketing/SitePackVisual.svelte';

	import * as m from '$lib/paraglide/messages';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { canonicalUrl } from '$lib/seo';
	import { resolve } from '$app/paths';
	import { linkEngine } from '$lib/utils';

	import { apiClient } from '$lib/api-client';
	import { onMount } from 'svelte';
	import PricingSection from './_components/PricingSection.svelte';
	import ProActivationPanel from './_components/ProActivationPanel.svelte';

	let { data } = $props();
	let billingCycle = $state(
		page.url.searchParams.get('cycle') === 'monthly' ? 'monthly' : 'yearly'
	);
	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));
	const enginePort = $derived(Number(page.url.searchParams.get('engine_port')) || 0);
	const isPro = $derived(data.isPro || false);
	let linkStatus = $state<'idle' | 'loading' | 'pending' | 'error'>('idle');

	async function handleLinkEngine() {
		if (linkStatus === 'loading') return;
		linkStatus = 'loading';
		try {
			const createApiKey = async () => {
				const { data: apiKeyData, error: apiError } =
					await apiClient.v1.account['api-key'].create.get();

				if (apiError)
					throw new Error((apiError.value as string) || 'Failed to create API key');
				if (!apiKeyData) throw new Error('Failed to create API key');
				return apiKeyData.apiKey;
			};

			const result = await linkEngine(createApiKey);
			linkStatus = result.status;
		} catch (err) {
			console.error('Linking error:', err);
			linkStatus = 'error';
		}
	}

	onMount(() => {
		if (isPro && (origin === 'ace-engine' || origin === 'aceblocker')) {
			handleLinkEngine();
		}
	});

	function handleUpgrade() {
		const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
		if (!$session.data) {
			const checkoutParams = new URLSearchParams({
				cycle: billingCycle,
				currency: data.pricing.currency,
				theme
			});
			if (origin) checkoutParams.set('origin', origin);
			if (enginePort) checkoutParams.set('engine_port', String(enginePort));
			const signInUrl = `${resolve('/signin')}?${new URLSearchParams({ redirectTo: `${resolve('/checkout')}?${checkoutParams}` })}`;
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- signInUrl was built using resolve().
			goto(signInUrl);
			return;
		}

		const params = new URLSearchParams({
			cycle: billingCycle,
			currency: data.pricing.currency,
			theme
		});
		if (origin) params.set('origin', origin);
		if (enginePort) params.set('engine_port', String(enginePort));
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- URL is composed using resolve().
		goto(`${resolve('/checkout')}?${params}`);
	}
</script>

<svelte:head>
	<title>{m.page_title_get_pro()}</title>
	<meta name="description" content={m.page_description_get_pro()} />
	<meta property="og:title" content={m.page_title_get_pro()} />
	<meta property="og:description" content={m.page_description_get_pro()} />
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.page_title_get_pro()} />
	<meta name="twitter:description" content={m.page_description_get_pro()} />
</svelte:head>

<Navbar {isPro} />

<main id="main-content">
	<section class="border-b border-border">
		<div class="ace-shell py-12 sm:py-16">
			{#if !isPro}
				<div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
					<div>
						<p class="font-mono text-xs text-muted-foreground">
							{m.site_brand_name()} / {m.plan_pro_name()}
						</p>
						<h1
							class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
						>
							{m.pro_title()}
						</h1>
					</div>
					<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground lg:pb-1">
						{m.pricing_compare_description()}
					</p>
				</div>
			{:else}
				<ProActivationPanel status={linkStatus} onactivate={handleLinkEngine} />
			{/if}
		</div>
	</section>

	{#if !isPro}
		<section class="border-b border-border bg-background py-12 sm:py-16">
			<div class="ace-shell">
				<PricingSection
					pricing={data.pricing}
					bind:billingCycle
					onupgrade={handleUpgrade}
				/>
			</div>
		</section>

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
						<ResistanceScale />
					</div>
				</div>
				<div>
					<h2 class="font-display text-3xl font-semibold">{m.about_packs_title()}</h2>
					<p class="mt-3 max-w-lg leading-relaxed text-muted-foreground">
						{m.pricing_categories_description()}
					</p>
					<div class="mt-7">
						<SitePackVisual />
					</div>
				</div>
			</div>
		</section>
	{/if}
</main>

<MarketingFooter />
