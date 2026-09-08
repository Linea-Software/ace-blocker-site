<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Check,
		AlertCircle,
		Loader2,
		Crown
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { linkEngine } from '$lib/utils';
	import { engineConfig } from '$lib/states/engine.svelte';
	import { apiClient } from '$lib/api-client';
	import { onMount } from 'svelte';
	import PricingSection from './_components/PricingSection.svelte';
	import FeatureShowcase from './_components/FeatureShowcase.svelte';

	let { data } = $props();
	let billingCycle = $state('yearly');
	let isDark = $derived(mode.current === 'dark');
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
			goto(`/signin${origin ? `?origin=${origin}` : ''}`);
			return;
		}

		const slug = billingCycle === 'yearly' ? data.pricing.yearlySlug : data.pricing.monthlySlug;
		authClient.dodopayments.checkoutSession({ slug });
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

<main
	class="min-h-[calc(100vh-4rem)] bg-background py-16 transition-colors duration-500 md:py-24 dark:bg-background dark:text-slate-50"
>
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="mx-auto mb-16 max-w-3xl space-y-6 text-center">
			{#if engineConfig.linkState === 'error'}
				<div
					class="mb-6 flex items-center justify-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-4 text-brand"
				>
					<AlertCircle class="h-5 w-5" />
					<span class="font-medium">{m.linking_error()}</span>
				</div>
			{/if}

			{#if engineConfig.linkState === 'loading'}
				<div
					class="mb-6 flex items-center justify-center gap-2 rounded-lg border border-brand/20 bg-brand/5 p-4 text-brand"
				>
					<Loader2 class="h-5 w-5 animate-spin" />
					<span class="font-medium">{m.linking_loading()}</span>
				</div>
			{/if}

			{#if engineConfig.linkState === 'success'}
				<div
					class="mb-6 flex items-center justify-center gap-2 rounded-lg border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-500"
				>
					<Check class="h-5 w-5" />
					<span class="font-medium">{m.linking_success()}</span>
				</div>
			{/if}

			{#if !isPro}
				<h1
					class="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white"
				>
					{m.pro_title()}
				</h1>
				<p class="mx-auto max-w-xl text-lg text-slate-600 md:text-xl dark:text-slate-400">
					{m.pro_subtitle()}
				</p>
			{:else}
				<div class="flex flex-col items-center justify-center space-y-6 py-12">
					<div class="relative">
						<div
							class="absolute inset-0 animate-pulse rounded-full bg-brand/20 blur-2xl"
						></div>
						<div
							class="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-brand to-amber-600 shadow-2xl"
						>
							<Crown class="h-12 w-12 text-slate-950" />
						</div>
					</div>
					<div class="space-y-2">
						<h1
							class="text-4xl font-black tracking-tight text-slate-900 dark:text-white"
						>
							{m.pro_success_title()}
						</h1>
						<p class="mx-auto max-w-lg text-lg text-slate-600 dark:text-slate-400">
							{m.pro_success_description()}
						</p>
					</div>
					<div class="mt-8 flex flex-col gap-4 sm:flex-row">
						<Button
							href="/"
							class="bg-foreground px-8 py-6 text-lg font-bold text-background hover:bg-foreground/85"
						>
							Go to Home
						</Button>
						<Button
							variant="outline"
							onclick={handleLinkEngine}
							class="border-brand/50 bg-transparent px-8 py-6 text-lg font-bold text-brand hover:bg-brand/10 dark:border-brand/30"
						>
							Open Ace Blocker
						</Button>
					</div>
				</div>
			{/if}
		</div>

		{#if !isPro}
			<PricingSection pricing={data.pricing} bind:billingCycle onupgrade={handleUpgrade} />
		{/if}

		<FeatureShowcase />
	</div>
</main>

<footer
	class="border-t border-slate-200 bg-slate-50 py-16 transition-colors duration-500 dark:border-slate-900 dark:bg-background"
>
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				{#if isDark}
					<img src={darkFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{:else}
					<img src={lightFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{/if}
			</div>
			<p class="text-sm text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div
				class="flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400"
			>
				<a
					href="/terms"
					class="transition-colors hover:text-amber-600 dark:hover:text-brand"
					>{m.footer_terms()}</a
				>
				<a
					href="/privacy"
					class="transition-colors hover:text-amber-600 dark:hover:text-brand"
					>{m.footer_privacy()}</a
				>
			</div>
		</div>
	</div>
</footer>

<style>
	:global(html) {
		scroll-behavior: smooth;
		background-color: white;
	}

	:global(html.dark) {
		background-color: var(--background);
	}

	:global(body) {
		background-color: white;
		color: var(--foreground);
	}

	:global(.dark body) {
		background-color: var(--background);
		color: #f8fafc;
	}
</style>
