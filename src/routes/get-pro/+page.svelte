<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Check,
		Shield,
		Timer,
		Infinity,
		Layers,
		Cloud,
		Sparkles,
		Globe,
		Loader2,
		AlertCircle,
		Clock,
		Lock,
		MoreVertical
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '$lib/components/ui/alert';
	import { cn, linkEngine } from '$lib/utils';
	import { engineConfig } from '$lib/states/engine.svelte';
	import { Crown } from '@lucide/svelte';
	import { apiClient } from '$lib/api-client';
	import { onMount } from 'svelte';

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
							class="bg-slate-900 px-8 py-6 text-lg font-bold dark:bg-white dark:text-slate-950"
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
			<!-- Billing Toggle -->
			<div class="mb-16 flex justify-center">
				<!-- ... rest of billing toggle ... -->
				<div
					class="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900/50"
				>
					<button
						class={cn(
							'flex items-center justify-center rounded-full px-8 py-2.5 text-sm font-bold transition-all duration-200',
							billingCycle === 'monthly'
								? 'bg-white text-slate-900 shadow-md dark:bg-slate-800 dark:text-white'
								: 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
						)}
						onclick={() => (billingCycle = 'monthly')}
					>
						Monthly
					</button>
					<button
						class={cn(
							'flex items-center justify-center gap-2 rounded-full px-8 py-2.5 text-sm font-bold transition-all duration-200',
							billingCycle === 'yearly'
								? 'bg-brand text-background shadow-[0_0_20px_rgba(255,191,0,0.2)]'
								: 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
						)}
						onclick={() => (billingCycle = 'yearly')}
					>
						Yearly
						<span
							class={cn(
								'rounded px-1.5 py-0.5 text-[10px] font-black uppercase',
								billingCycle === 'yearly'
									? 'bg-black/10'
									: 'bg-brand/20 text-amber-600 dark:text-brand'
							)}
						>
							-{data.pricing.discountPercent}%
						</span>
					</button>
				</div>
			</div>

			<!-- Pricing Grid -->
			<div class="mx-auto grid max-w-5xl grid-cols-1 items-stretch gap-8 md:grid-cols-2">
				<!-- Free Plan -->
				<Card.Root
					class="relative flex flex-col overflow-hidden border-slate-200 bg-white shadow-sm transition-all duration-300 dark:border-slate-800/50 dark:bg-slate-900/20"
				>
					<Card.Header class="space-y-6 pb-8">
						<div class="flex items-center gap-2">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400"
							>
								<Shield class="h-6 w-6" />
							</div>
							<Card.Title
								class="text-2xl font-black text-slate-900 dark:text-slate-200"
								>{m.plan_free_name()}</Card.Title
							>
						</div>
						<div class="flex flex-col">
							<div class="flex items-baseline gap-1">
								<span
									class="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-200"
									>{m.plan_free_price()}</span
								>
								<span class="text-slate-500">/forever</span>
							</div>
							<p class="mt-4 text-slate-600 dark:text-slate-400">
								{m.plan_free_description()}
							</p>
						</div>
					</Card.Header>
					<Card.Content class="flex flex-1 flex-col space-y-5">
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
							>
								<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
							</div>
							<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
								>{m.feature_unlimited_devices()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
							>
								<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
							</div>
							<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
								>{m.feature_blocks_unlimited()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800/30"
							>
								<Check class="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
							</div>
							<span class="text-sm font-medium text-slate-600 dark:text-slate-400"
								>{m.feature_lists_basic()}</span
							>
						</div>
						<div class="mt-auto">
							<p class="text-center text-xs text-muted-foreground">
								No credit card required. Free forever.
							</p>
						</div>
					</Card.Content>
					<Card.Footer class="pt-8">
						<Button
							variant="outline"
							class="h-12 w-full border-slate-200 bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
							href="/signup"
						>
							{m.cta_get_started()}
						</Button>
					</Card.Footer>
				</Card.Root>

				<!-- Pro Plan -->
				<Card.Root
					class="relative flex flex-col overflow-hidden border-2 border-brand bg-white shadow-xl transition-all duration-300 md:-mt-4 md:-mb-4 dark:bg-slate-900/60 dark:shadow-[0_0_50px_rgba(255,191,0,0.15)] dark:backdrop-blur-sm"
				>
					<!-- Savings Badge -->
					{#if billingCycle === 'yearly'}
						<div class="absolute top-0 right-0 p-4">
							<div class="flex flex-col items-end gap-1">
								<Badge
									class="border-none bg-brand px-4 py-1.5 text-[10px] font-black text-background shadow-lg"
								>
									{m.savings_badge({ percent: data.pricing.discountPercent })}
								</Badge>
							</div>
						</div>
					{/if}

					<Card.Header class="space-y-6 pb-8">
						<div class="flex items-center gap-3">
							<div class="relative flex h-12 w-12 items-center justify-center">
								<div
									class="absolute inset-0 animate-pulse rounded-xl bg-brand/20 blur-lg"
								></div>
								<div
									class="relative flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-background"
								>
									<Shield class="absolute h-7 w-7 opacity-20" />
									<Timer class="h-7 w-7" />
								</div>
							</div>
							<Card.Title class="text-3xl font-black text-brand"
								>{m.plan_pro_name()}</Card.Title
							>
						</div>

						<div class="flex flex-col">
							<div class="flex items-baseline gap-2">
								{#if billingCycle === 'yearly'}
									<div class="flex flex-col">
										<span
											class="text-sm font-bold text-slate-400 line-through decoration-brand/50 dark:text-slate-500"
											>{data.pricing.symbol}{data.pricing
												.yearlyStrikethrough}</span
										>
										<div class="flex items-baseline gap-1">
											<span
												class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
												>{data.pricing.symbol}{data.pricing
													.yearlyPrice}</span
											>
											<span class="text-slate-500 dark:text-slate-400"
												>/year</span
											>
										</div>
									</div>
								{:else}
									<span
										class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
										>{data.pricing.symbol}{data.pricing.monthlyPrice}</span
									>
									<span class="text-slate-500 dark:text-slate-400">/month</span>
								{/if}
							</div>
							<!-- Trial Subtitle -->
							<p class="mt-2 text-sm font-bold text-amber-600 dark:text-brand/90">
								{m.trial_subtitle()}
							</p>
							<p
								class="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400"
							>
								{m.plan_pro_description()}
							</p>
						</div>
					</Card.Header>

					<Card.Content class="flex-1 space-y-5">
						<div class="mb-2 flex items-center gap-2">
							<div
								class="h-[1px] flex-1 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0"
							></div>
							<p
								class="text-[10px] font-black tracking-widest text-brand uppercase"
							>
								{m.feature_pro_plus_basic()}
							</p>
							<div
								class="h-[1px] flex-1 bg-gradient-to-r from-brand/0 via-brand/30 to-brand/0"
							></div>
						</div>

						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
							>
								<Check class="h-3.5 w-3.5 text-brand" />
							</div>
							<span class="text-sm font-bold text-slate-900 dark:text-white"
								>{m.feature_lists_all()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
							>
								<Check class="h-3.5 w-3.5 text-brand" />
							</div>
							<span class="text-sm font-bold text-slate-900 dark:text-white"
								>{m.feature_lists_custom()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
							>
								<Check class="h-3.5 w-3.5 text-brand" />
							</div>
							<span class="text-sm font-bold text-slate-900 dark:text-white"
								>{m.feature_cloud_backup()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
							>
								<Check class="h-3.5 w-3.5 text-brand" />
							</div>
							<span class="text-sm font-bold text-slate-900 dark:text-white"
								>{m.feature_scripts_premium()}</span
							>
						</div>
						<div class="flex items-center gap-4">
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-brand/10"
							>
								<Check class="h-3.5 w-3.5 text-brand" />
							</div>
							<span class="text-sm font-bold text-slate-900 dark:text-white"
								>{m.feature_unlimited_devices()}</span
							>
						</div>

						<p class="pt-2 text-[10px] leading-relaxed text-slate-500 italic">
							*Taxes included. Price at checkout will be converted to your local
							currency.
						</p>
					</Card.Content>

					<Card.Footer class="flex flex-col gap-3 pt-8 pb-10">
						<Button
							class="group relative h-16 w-full overflow-hidden bg-brand text-xl font-black text-white shadow-[0_10px_30px_rgba(255,191,0,0.3)] transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
							onclick={handleUpgrade}
						>
							<span class="relative z-10">{m.cta_upgrade_now()}</span>
							<div
								class="absolute inset-0 z-0 -translate-x-full bg-gradient-to-r from-white/0 via-white/20 to-white/0 transition-transform duration-500 group-hover:translate-x-full"
							></div>
						</Button>
						<!-- Trial Caption -->
						<p class="text-center text-xs font-bold text-slate-400">
							{m.trial_cta_caption()}
						</p>
					</Card.Footer>
				</Card.Root>
			</div>
		{/if}

		<!-- Refined Features Section -->
		<div class="mx-auto mt-40 max-w-6xl">
			<div class="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
				<div class="space-y-12">
					<div class="space-y-4">
						<h2
							class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white"
						>
							{m.toolbox_title()}
						</h2>
						<p class="text-lg text-slate-600 dark:text-slate-400">
							{m.toolbox_description()}
						</p>
					</div>

					<div class="grid grid-cols-1 gap-8">
						<!-- Resistance Mode Protocols -->
						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Sparkles class="h-6 w-6 text-brand" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									{m.toolbox_resistance_mode_title()}
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									{m.toolbox_resistance_mode_description()}
								</p>
							</div>
						</div>

						<!-- Premium Blocklists -->
						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Layers class="h-6 w-6 text-brand" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									{m.toolbox_blocklists_title()}
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									{m.toolbox_blocklists_description()}
								</p>
							</div>
						</div>

						<!-- Cloud Backup -->
						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Cloud class="h-6 w-6 text-brand" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									{m.toolbox_cloud_backup_title()}
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									{m.toolbox_cloud_backup_description()}
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- App Screenshot -->
				<div class="group relative flex items-center justify-center overflow-hidden">
					<img
						src={isDark
							? 'https://cdn.aceblocker.com/showcase/resistance-mode-sites-section-dark.png'
							: 'https://cdn.aceblocker.com/showcase/resistance-mode-sites-section-light.png'}
						alt="Resistance Scripts feature showing active friction scripts for Instagram, Reddit, TikTok, Twitch and YouTube"
						class="w-full rounded-xl border border-border shadow-sm"
					/>
				</div>
			</div>
		</div>
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
		color: #0f172a;
	}

	:global(.dark body) {
		background-color: var(--background);
		color: #f8fafc;
	}
</style>
