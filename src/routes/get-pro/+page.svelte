<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import ResistanceScale from '$lib/components/marketing/ResistanceScale.svelte';
	import SitePackVisual from '$lib/components/marketing/SitePackVisual.svelte';
	import { AlertCircle, Check, Loader2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { linkEngine } from '$lib/utils';
	import { engineConfig } from '$lib/states/engine.svelte';
	import { apiClient } from '$lib/api-client';
	import { onMount } from 'svelte';
	import PricingSection from './_components/PricingSection.svelte';

	let { data } = $props();
	let billingCycle = $state(
		page.url.searchParams.get('cycle') === 'monthly' ? 'monthly' : 'yearly'
	);
	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));
	const enginePort = $derived(Number(page.url.searchParams.get('engine_port')) || 0);
	const isPro = $derived(data.isPro || false);

	async function handleLinkEngine() {
		engineConfig.linkState = 'loading';
		try {
			const createApiKey = async () => {
				const { data: apiKeyData, error: apiError } =
					await apiClient.v1.account['api-key'].create.get();

				if (apiError)
					throw new Error((apiError.value as string) || 'Failed to create API key');
				if (!apiKeyData) throw new Error('Failed to create API key');
				return apiKeyData.apiKey;
			};

			const result = await linkEngine(enginePort, createApiKey);

			if (result.success) {
				engineConfig.linkState = 'success';
			} else {
				console.error('Linking error:', result.error);
				engineConfig.linkState = 'error';
			}
		} catch (err) {
			console.error('Linking error:', err);
			engineConfig.linkState = 'error';
		}
	}

	onMount(() => {
		if (isPro && (origin === 'ace-engine' || origin === 'aceblocker')) {
			handleLinkEngine();
		} else {
			console.log(`isPro: ${isPro}; origin: ${origin}`);
		}
	});

	function handleUpgrade() {
		if (!$session.data) {
			const checkoutParams = new URLSearchParams({
				cycle: billingCycle,
				currency: data.pricing.currency
			});
			if (origin) checkoutParams.set('origin', origin);
			if (enginePort) checkoutParams.set('engine_port', String(enginePort));
			const signInUrl = `${resolve('/signin')}?${new URLSearchParams({ redirectTo: `${resolve('/checkout')}?${checkoutParams}` })}`;
			goto(signInUrl);
			return;
		}

		const params = new URLSearchParams({
			cycle: billingCycle,
			currency: data.pricing.currency
		});
		if (origin) params.set('origin', origin);
		if (enginePort) params.set('engine_port', String(enginePort));
		goto(`${resolve('/checkout')}?${params}`);
	}
</script>

<svelte:head>
	<title>{m.page_title_get_pro()}</title>
	<meta name="description" content={m.page_description_get_pro()} />
	<meta property="og:title" content={m.page_title_get_pro()} />
	<meta property="og:description" content={m.page_description_get_pro()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_get_pro()} />
	<meta name="twitter:description" content={m.page_description_get_pro()} />
</svelte:head>

<Navbar {isPro} />

<main id="main-content">
	<section class="border-b border-border">
		<div class="ace-shell py-12 sm:py-16">
			{#if engineConfig.linkState === 'error' || engineConfig.linkState === 'loading' || engineConfig.linkState === 'success'}
				<div
					class={[
						'mb-8 flex max-w-3xl items-start gap-3 rounded-md border px-4 py-3 text-sm',
						engineConfig.linkState === 'error' &&
							'border-danger/35 bg-danger/10 text-foreground',
						engineConfig.linkState === 'loading' &&
							'border-information/35 bg-information/10 text-foreground',
						engineConfig.linkState === 'success' &&
							'border-success/35 bg-success/10 text-foreground'
					]}
					aria-live="polite"
				>
					{#if engineConfig.linkState === 'error'}
						<AlertCircle
							class="mt-0.5 size-4 shrink-0 text-danger"
							aria-hidden="true"
						/>
						<span>{m.linking_error()}</span>
					{:else if engineConfig.linkState === 'loading'}
						<Loader2
							class="mt-0.5 size-4 shrink-0 animate-spin text-information"
							aria-hidden="true"
						/>
						<span>{m.linking_loading()}</span>
					{:else if engineConfig.linkState === 'success'}
						<Check class="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
						<span>{m.linking_success()}</span>
					{/if}
				</div>
			{/if}

			{#if !isPro}
				<div class="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
					<div>
						<p class="font-mono text-xs text-muted-foreground">
							{m.about_hero_app()} / {m.plan_pro_name()}
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
				<div class="max-w-3xl border-l-4 border-success pl-5 sm:pl-7">
					<div class="flex items-center gap-2 text-sm font-medium text-success">
						<Check class="size-4" aria-hidden="true" />
						{m.plan_pro_name()}
					</div>
					<h1 class="mt-4 font-display text-5xl font-semibold">
						{m.pro_success_title()}
					</h1>
					<p class="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
						{m.pro_success_description()}
					</p>
					<div class="mt-7 flex flex-col gap-3 sm:flex-row">
						<a
							href={resolve('/')}
							class="inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
						>
							{m.pro_success_home()}
						</a>
						<button
							type="button"
							onclick={handleLinkEngine}
							class="inline-flex min-h-12 items-center justify-center rounded-md border border-foreground/30 px-5 font-medium hover:bg-accent"
						>
							{m.pro_success_open_app()}
						</button>
					</div>
				</div>
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
						{m.toolbox_resistance_mode_description()}
					</p>
					<div class="mt-7">
						<ResistanceScale />
					</div>
				</div>
				<div>
					<h2 class="font-display text-3xl font-semibold">{m.about_packs_title()}</h2>
					<p class="mt-3 max-w-lg leading-relaxed text-muted-foreground">
						{m.toolbox_blocklists_description()}
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
