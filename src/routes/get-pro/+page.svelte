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
		AlertCircle
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import * as Alert from '$lib/components/ui/alert';
	import { cn } from '$lib/utils';

	let billingCycle = $state('yearly');
	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));

	let error = $state<string | null>(null);
	let loading = $state(false);

	async function linkEngine() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/v1/account/link-engine', {
				method: 'POST'
			});
			if (!res.ok) throw new Error('Failed to link engine');
			const data = await res.json();
			const apiKey = data.apiKey;

			const localUrl = `https://ace-engine.local/account/api-key?apiKey=${apiKey}`;
			const protocolUrl = `aceblocker://account/api-key?apiKey=${apiKey}`;

			try {
				// Try the local engine first via HTTPS
				const localRes = await fetch(localUrl, { method: 'GET' });
				if (localRes.ok) {
					goto('/');
				} else {
					window.location.href = protocolUrl;
				}
			} catch (err) {
				// If local engine is not reachable or CORS fails, fall back to custom protocol
				console.warn('Local engine link failed, falling back to protocol:', err);
				window.location.href = protocolUrl;
			}
		} catch (err) {
			console.error(err);
			loading = false;
			error = 'Failed to generate access keys for the engine.';
		}
	}

	$effect(() => {
		if ($session.data && (origin === 'ace-engine' || origin === 'aceblocker') && !loading) {
			linkEngine();
		}
	});

	function handleUpgrade() {
		if ($session.data) {
			const slug = billingCycle === 'yearly' ? 'ace_blocker_yearly' : 'ace_blocker_monthly';
			goto(`/checkout?slug=${slug}${origin ? `&origin=${origin}` : ''}`);
		} else {
			goto(`/signin${origin ? `?origin=${origin}` : ''}`);
		}
	}
</script>

<Navbar />

<main
	class="min-h-[calc(100vh-4rem)] bg-white py-16 text-slate-900 transition-colors duration-500 md:py-24 dark:bg-[#0B0B0F] dark:text-slate-50"
>
	<div class="container mx-auto px-4">
		<!-- Header -->
		<div class="mx-auto mb-16 max-w-3xl space-y-6 text-center">
			{#if error}
				<Alert.Root variant="destructive" class="mb-6 border-red-900/50 bg-red-900/10 text-red-400">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}

			{#if loading}
				<div
					class="mb-6 flex items-center justify-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-amber-500"
				>
					<Loader2 class="h-5 w-5 animate-spin" />
					<span class="font-medium">Linking your account to Ace Engine...</span>
				</div>
			{/if}

			<Badge
				variant="outline"
				class="border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-semibold tracking-wider text-amber-500 uppercase"
			>
				{m.hero_new_badge()}
			</Badge>
			<h1
				class="text-4xl font-black tracking-tight text-slate-900 sm:text-5xl md:text-6xl dark:text-white"
			>
				{m.pro_title()}
			</h1>
			<p class="mx-auto max-w-xl text-lg text-slate-600 md:text-xl dark:text-slate-400">
				{m.pro_subtitle()}
			</p>
		</div>

		<!-- Billing Toggle -->
		<div class="mb-16 flex justify-center">
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
							? 'bg-[#FFBF00] text-[#0B0B0F] shadow-[0_0_20px_rgba(255,191,0,0.2)]'
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
								: 'bg-amber-500/20 text-amber-600 dark:text-amber-500'
						)}
					>
						-30%
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
						<Card.Title class="text-2xl font-black text-slate-900 dark:text-slate-200"
							>{m.plan_free_name()}</Card.Title
						>
					</div>
					<div class="flex flex-col">
						<div class="flex items-baseline gap-1">
							<span class="text-5xl font-black tracking-tight text-slate-900 dark:text-slate-200"
								>{m.plan_free_price()}</span
							>
							<span class="text-slate-500">/forever</span>
						</div>
						<p class="mt-4 text-slate-600 dark:text-slate-400">
							{m.plan_free_description()}
						</p>
					</div>
				</Card.Header>
				<Card.Content class="flex-1 space-y-5">
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
				class="relative flex flex-col overflow-hidden border-2 border-[#FFBF00] bg-white shadow-xl transition-all duration-300 md:-mt-4 md:-mb-4 dark:bg-slate-900/60 dark:shadow-[0_0_50px_rgba(255,191,0,0.15)] dark:backdrop-blur-sm"
			>
				<!-- SAVE 30% Badge -->
				{#if billingCycle === 'yearly'}
					<div class="absolute top-0 right-0 p-4">
						<div class="flex flex-col items-end gap-1">
							<Badge
								class="border-none bg-[#FFBF00] px-4 py-1.5 text-[10px] font-black text-[#0B0B0F] shadow-lg"
							>
								{m.savings_badge()}
							</Badge>
						</div>
					</div>
				{/if}

				<Card.Header class="space-y-6 pb-8">
					<div class="flex items-center gap-3">
						<div class="relative flex h-12 w-12 items-center justify-center">
							<div class="absolute inset-0 animate-pulse rounded-xl bg-[#FFBF00]/20 blur-lg"></div>
							<div
								class="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFBF00] text-[#0B0B0F]"
							>
								<Shield class="absolute h-7 w-7 opacity-20" />
								<Timer class="h-7 w-7" />
							</div>
						</div>
						<Card.Title class="text-3xl font-black text-[#FFBF00]">{m.plan_pro_name()}</Card.Title>
					</div>

					<div class="flex flex-col">
						<div class="flex items-baseline gap-2">
							{#if billingCycle === 'yearly'}
								<div class="flex flex-col">
									<span
										class="text-sm font-bold text-slate-400 line-through decoration-[#FFBF00]/50 dark:text-slate-500"
										>{m.plan_pro_price_yearly_old()}</span
									>
									<div class="flex items-baseline gap-1">
										<span
											class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
											>{m.plan_pro_price_yearly()}</span
										>
										<span class="text-slate-500 dark:text-slate-400">/year</span>
									</div>
								</div>
							{:else}
								<span
									class="font-mono text-6xl font-black tracking-tighter text-slate-900 dark:text-white"
									>{m.plan_pro_price_monthly()}</span
								>
								<span class="text-slate-500 dark:text-slate-400">/month</span>
							{/if}
						</div>
						<!-- Trial Subtitle -->
						<p class="mt-2 text-sm font-bold text-amber-600 dark:text-amber-500/90">
							{m.trial_subtitle()}
						</p>
						<p class="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
							{m.plan_pro_description()}
						</p>
					</div>
				</Card.Header>

				<Card.Content class="flex-1 space-y-5">
					<div class="mb-2 flex items-center gap-2">
						<div
							class="h-[1px] flex-1 bg-gradient-to-r from-[#FFBF00]/0 via-[#FFBF00]/30 to-[#FFBF00]/0"
						></div>
						<p class="text-[10px] font-black tracking-widest text-[#FFBF00] uppercase">
							{m.feature_pro_plus_basic()}
						</p>
						<div
							class="h-[1px] flex-1 bg-gradient-to-r from-[#FFBF00]/0 via-[#FFBF00]/30 to-[#FFBF00]/0"
						></div>
					</div>

					<div class="flex items-center gap-4">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFBF00]/10">
							<Check class="h-3.5 w-3.5 text-[#FFBF00]" />
						</div>
						<span class="text-sm font-bold text-slate-900 dark:text-white"
							>{m.feature_lists_all()}</span
						>
					</div>
					<div class="flex items-center gap-4">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFBF00]/10">
							<Check class="h-3.5 w-3.5 text-[#FFBF00]" />
						</div>
						<span class="text-sm font-bold text-slate-900 dark:text-white"
							>{m.feature_lists_custom()}</span
						>
					</div>
					<div class="flex items-center gap-4">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFBF00]/10">
							<Check class="h-3.5 w-3.5 text-[#FFBF00]" />
						</div>
						<span class="text-sm font-bold text-slate-900 dark:text-white"
							>{m.feature_sync_cloud()}</span
						>
					</div>
					<div class="flex items-center gap-4">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFBF00]/10">
							<Check class="h-3.5 w-3.5 text-[#FFBF00]" />
						</div>
						<span class="text-sm font-bold text-slate-900 dark:text-white"
							>{m.feature_scripts_premium()}</span
						>
					</div>
					<div class="flex items-center gap-4">
						<div class="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFBF00]/10">
							<Check class="h-3.5 w-3.5 text-[#FFBF00]" />
						</div>
						<span class="text-sm font-bold text-slate-900 dark:text-white"
							>{m.feature_unlimited_devices()}</span
						>
					</div>

					<p class="pt-2 text-[10px] leading-relaxed text-slate-500 italic">
						*Taxes included. Price at checkout will be converted to your local currency.
					</p>
				</Card.Content>

				<Card.Footer class="flex flex-col gap-3 pt-8 pb-10">
					<Button
						class="group relative h-16 w-full overflow-hidden bg-[#FFBF00] text-xl font-black text-slate-950 shadow-[0_10px_30px_rgba(255,191,0,0.3)] transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
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

		<!-- Refined Features Section -->
		<div class="mx-auto mt-40 max-w-6xl">
			<div class="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
				<div class="space-y-12">
					<div class="space-y-4">
						<h2
							class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white"
						>
							The ultimate focus toolbox.
						</h2>
						<p class="text-lg text-slate-600 dark:text-slate-400">
							Don't just block sites. Change your relationship with the internet using our advanced
							features designed for deep work.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-8">
						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Infinity class="h-6 w-6 text-amber-500" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									Unlimited Everything
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									With a generous free plan that included unlimited network blocks plus unlimited
									locks as well as 3 site lists.
								</p>
							</div>
						</div>

						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Sparkles class="h-6 w-6 text-amber-500" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									Premium Boredom Scripts
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									Make addictive sites boring by stripping away reels, infinite scrolls, and
									manipulative notifications.
								</p>
							</div>
						</div>

						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Layers class="h-6 w-6 text-amber-500" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									Curated Intelligence
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									Stop hunting for blocklists. We provide expertly curated lists for all major
									distractions, updated regularly.
								</p>
							</div>
						</div>

						<div class="flex gap-5">
							<div
								class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
							>
								<Cloud class="h-6 w-6 text-amber-500" />
							</div>
							<div class="space-y-1">
								<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
									Cloud Sync & Backup
								</h3>
								<p class="text-slate-600 dark:text-slate-400">
									Your settings, schedules and lists are synced across all your devices and backed
									up securely.
								</p>
							</div>
						</div>
					</div>
				</div>

				<!-- Visual Representation Section -->
				<div
					class="group relative flex aspect-square items-center justify-center overflow-hidden rounded-[3rem] border border-slate-200 bg-slate-50 p-12 dark:border-slate-800 dark:bg-slate-950/50"
				>
					<!-- Glow effect -->
					<div
						class="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[120px] transition-all duration-500 group-hover:bg-amber-500/15"
					></div>

					<div class="relative w-full max-w-sm space-y-8">
						<div
							class="translate-y-4 -rotate-2 transform rounded-3xl border border-amber-500/30 bg-white p-6 shadow-2xl transition-all duration-500 group-hover:translate-y-0 group-hover:rotate-0 group-hover:border-amber-500 dark:border-amber-500/50 dark:bg-[#0B0B0F]"
						>
							<div class="mb-6 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<div
										class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500"
									>
										<Globe class="h-5 w-5" />
									</div>
									<div class="space-y-1.5">
										<div class="h-2.5 w-24 rounded-full bg-slate-800"></div>
										<div class="h-2 w-16 rounded-full bg-slate-900"></div>
									</div>
								</div>
								<div
									class="h-6 w-12 rounded-full bg-[#FFBF00] shadow-[0_0_15px_rgba(255,191,0,0.3)]"
								></div>
							</div>
							<div class="space-y-3">
								<div class="h-2 w-full rounded-full bg-slate-800/50"></div>
								<div class="h-2 w-4/5 rounded-full bg-slate-800/50"></div>
								<div class="h-2 w-3/4 rounded-full bg-slate-800/30"></div>
							</div>
						</div>

						<div
							class="translate-x-12 -translate-y-8 rotate-6 transform rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md transition-all duration-500 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:rotate-0"
						>
							<div class="mb-4 flex items-center gap-3">
								<Shield class="h-5 w-5 text-amber-500" />
								<div class="h-2.5 w-32 rounded-full bg-slate-700"></div>
							</div>
							<div class="space-y-3">
								<div class="flex items-center justify-between">
									<div class="h-2 w-20 rounded-full bg-slate-800"></div>
									<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
								</div>
								<div class="flex items-center justify-between">
									<div class="h-2 w-24 rounded-full bg-slate-800"></div>
									<div class="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
								</div>
								<div class="flex items-center justify-between opacity-50">
									<div class="h-2 w-16 rounded-full bg-slate-800"></div>
									<div class="h-1.5 w-1.5 rounded-full bg-slate-800"></div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</main>

<footer
	class="border-t border-slate-200 bg-slate-50 py-16 transition-colors duration-500 dark:border-slate-900 dark:bg-[#0B0B0F]"
>
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				<Shield class="h-7 w-7 text-amber-500" />
				<span class="text-xl font-black tracking-tight text-slate-900 dark:text-white"
					>{m.hero_title_app()}</span
				>
			</div>
			<p class="text-sm text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400">
				<a href="/terms" class="transition-colors hover:text-amber-600 dark:hover:text-[#FFBF00]"
					>{m.footer_terms()}</a
				>
				<a href="/privacy" class="transition-colors hover:text-amber-600 dark:hover:text-[#FFBF00]"
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
		background-color: #0b0b0f;
	}

	:global(body) {
		background-color: white;
		color: #0f172a;
	}

	:global(.dark body) {
		background-color: #0b0b0f;
		color: #f8fafc;
	}
</style>
