<script lang="ts">
	import { ShieldCheck, Download, CircleAlert, ArrowRight, Zap } from '@lucide/svelte';
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { invalidateAll } from '$app/navigation';
	import { apiClient } from '$lib/api-client';
	import { postApiKeyToEngine, buildEngineLinkUrl } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const status = $derived(page.url.searchParams.get('status'));
	const isSuccess = $derived(status === 'active' || !status);
	const isFailed = $derived(status === 'failed');

	const isPro = $derived(data.isPro);
	let verificationInProcess = $state(false);
	let activationStatus = $state<'idle' | 'activating' | 'success' | 'failed'>('idle');

	const pageTitle = $derived(isFailed ? 'Payment Unsuccessful' : 'Welcome to Pro');

	// Fail-safe verification check
	$effect(() => {
		if (isSuccess && !isPro && !verificationInProcess && data.success) {
			verifyProStatus();
		}
	});

	// Auto-activation trigger. The API key is requested on demand (kept in
	// ephemeral JS state only) so it never rides along with page data, and no
	// key is created for visitors who never activate the desktop app.
	$effect(() => {
		if (isSuccess && isPro && activationStatus === 'idle' && data.success) {
			const timer = setTimeout(activateInApp, 1000);
			return () => clearTimeout(timer);
		}
	});

	async function verifyProStatus() {
		verificationInProcess = true;
		try {
			await new Promise((resolve) => setTimeout(resolve, 2000));
			const res = await fetch('/api/v1/account/verify-pro', { method: 'POST' });
			if (res.ok) {
				const result = await res.json();
				if (result.isActive) {
					await invalidateAll();
				}
			}
		} catch (e) {
			console.error('Verification failed', e);
		} finally {
			verificationInProcess = false;
		}
	}

	async function activateInApp() {
		activationStatus = 'activating';
		try {
			// Request the desktop-app key on demand. It stays in ephemeral JS
			// state only — never in the page payload or browser history.
			const { data: keyData, error: keyError } =
				await apiClient.v1.account['api-key'].create.get();
			if (keyError) throw new Error((keyError.value as string) || 'Failed to create API key');
			if (!keyData) throw new Error('Failed to create API key');
			const apiKey = keyData.apiKey;

			const callbackUrl = encodeURIComponent(
				`${window.location.origin}${window.location.pathname}?activated=true`
			);
			const localUrl = 'https://ace-engine.local/account/api-key';
			const protocolUrl = buildEngineLinkUrl(apiKey, callbackUrl);

			try {
				// Key travels in the JSON body, never in the URL.
				const delivered = await postApiKeyToEngine(localUrl, apiKey);
				if (delivered) {
					activationStatus = 'success';
				} else {
					window.location.href = protocolUrl;
					setTimeout(() => {
						if (activationStatus === 'activating') activationStatus = 'success';
					}, 2500);
				}
			} catch (err) {
				window.location.href = protocolUrl;
				setTimeout(() => {
					if (activationStatus === 'activating') activationStatus = 'success';
				}, 2500);
			}
		} catch (err) {
			console.error('Activation error:', err);
			activationStatus = 'failed';
		}
	}
</script>

<svelte:head>
	<title>{pageTitle} — Ace Blocker</title>
	<meta name="description" content={m.page_description_checkout_completed()} />
	<meta property="og:title" content="{pageTitle} — Ace Blocker" />
	<meta property="og:description" content={m.page_description_checkout_completed()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="robots" content="noindex, nofollow" />
	<meta name="twitter:title" content="{pageTitle} — Ace Blocker" />
	<meta name="twitter:description" content={m.page_description_checkout_completed()} />
</svelte:head>

<Navbar {isPro} />

{#if isFailed}
	<main class="flex min-h-[calc(100vh-4rem)] flex-col antialiased">
		<!-- Failed Hero -->
		<section
			class="relative overflow-hidden bg-gradient-to-b from-background to-muted pt-20 pb-16 md:pt-32 md:pb-24 dark:from-slate-950 dark:to-slate-950"
		>
			<div
				class="pointer-events-none absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/5 blur-[120px]"
			></div>
			<div class="relative z-10 container mx-auto px-4">
				<div class="mx-auto max-w-2xl space-y-6 text-center">
					<div
						class="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10"
					>
						<CircleAlert class="h-10 w-10 text-red-500" />
					</div>
					<h1
						class="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl dark:text-white"
					>
						{m.checkout_failed_title()}
					</h1>
					<p
						class="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground dark:text-slate-400"
					>
						{m.checkout_failed_subtitle()}
					</p>
					<div class="pt-4">
						<a
							href="/get-pro"
							class="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-8 py-3.5 text-base font-bold text-white shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-400"
						>
							<ArrowRight class="h-4 w-4" />
							{m.checkout_retry_button()}
						</a>
					</div>
				</div>
			</div>
		</section>

		<!-- Support -->
		<section
			class="border-t border-border bg-muted py-12 dark:border-slate-800 dark:bg-slate-900/50"
		>
			<div class="container mx-auto px-4">
				<div
					class="mx-auto flex max-w-2xl flex-col items-center justify-between gap-4 sm:flex-row"
				>
					<span class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
						{m.checkout_support_header()}
					</span>
					<div class="flex flex-wrap items-center justify-center gap-6">
						<a
							href="/support"
							class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<ShieldCheck class="h-4 w-4" />
							{m.checkout_support_link()}
						</a>
						<a
							href="mailto:support@aceblocker.com"
							class="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="2"
								stroke-linecap="round"
								stroke-linejoin="round"
								><rect width="20" height="16" x="2" y="4" rx="2" /><path
									d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
								/></svg
							>
							{m.checkout_support_email()}
						</a>
					</div>
				</div>
			</div>
		</section>
	</main>
{:else}
	<main class="flex min-h-[calc(100vh-4rem)] flex-col antialiased">
		<!-- Hero Section -->
		<section
			class="relative overflow-hidden bg-gradient-to-b from-background to-muted pt-20 pb-16 md:pt-32 md:pb-28 dark:from-slate-950 dark:to-slate-950"
		>
			<!-- Ambient glow -->
			<div
				class="pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-[120px]"
			></div>
			<div
				class="pointer-events-none absolute top-[20%] right-0 h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[100px]"
			></div>

			<div class="relative z-10 container mx-auto px-4">
				<div class="mx-auto max-w-2xl space-y-6 text-center">
					<!-- Icon -->
					<div class="relative mx-auto mb-8 w-fit">
						<div
							class="absolute inset-0 scale-110 animate-pulse rounded-full bg-emerald-500/20 blur-2xl"
						></div>
						<img
							src="https://cdn.aceblocker.com/icon.png"
							alt="Ace Blocker"
							width="96"
							height="96"
							style="border-radius: 22px;"
							class="relative mx-auto shadow-lg"
						/>
					</div>

					<!-- Badge -->
					<div
						class="mx-auto inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-500/20 dark:text-emerald-400"
					>
						<Zap class="h-3.5 w-3.5" />
						Pro License Active
					</div>

					<!-- Heading -->
					<h1
						class="text-4xl font-extrabold tracking-tight text-foreground md:text-5xl dark:text-white"
					>
						{m.checkout_success_title()}
					</h1>

					<!-- Subtitle -->
					<p
						class="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground dark:text-slate-400"
					>
						{m.checkout_success_subtitle()}
					</p>
				</div>
			</div>
		</section>

		<!-- License Sync & Desktop App Sections -->
		<section
			class="border-t border-border bg-muted py-16 dark:border-slate-800 dark:bg-slate-900/50"
		>
			<div class="container mx-auto max-w-3xl px-4">
				<div class="space-y-4">
					<!-- License Sync -->
					<div
						class="flex flex-col items-start gap-6 rounded-xl border border-border bg-card px-8 py-6 transition-colors sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
					>
						<div class="flex-1">
							<p
								class="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase"
							>
								{m.checkout_sync_header()}
							</p>
							<p
								class="text-sm leading-relaxed text-muted-foreground dark:text-slate-400"
							>
								{m.checkout_sync_description()}
							</p>
						</div>
						<div
							class="inline-flex shrink-0 items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2 font-mono text-xs text-emerald-700 dark:text-emerald-400"
						>
							<span
								class="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
							></span>
							{m.checkout_sync_badge()}
						</div>
					</div>

					<!-- Desktop App -->
					<div
						class="flex flex-col items-start gap-6 rounded-xl border border-border bg-card px-8 py-6 transition-colors sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900"
					>
						<div class="flex-1">
							<p
								class="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase"
							>
								{m.checkout_client_header()}
							</p>
							<p
								class="text-sm leading-relaxed text-muted-foreground dark:text-slate-400"
							>
								{m.checkout_client_description()}
							</p>
						</div>
						<a
							href="/download"
							class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-bold text-white shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-400 sm:w-auto"
						>
							<Download class="h-4 w-4" />
							{m.checkout_download_button()}
						</a>
					</div>
				</div>
			</div>
		</section>

		<!-- Dashboard & Help -->
		<div class="container mx-auto max-w-3xl px-4 py-12">
			<div class="space-y-8">
				<!-- Return to Dashboard -->
				<a
					href="/"
					class="flex w-full items-center justify-center rounded-xl border border-border bg-transparent py-3.5 text-sm font-medium tracking-wide text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
				>
					{m.checkout_return_button()}
				</a>

				<!-- Help Footer -->
				<div
					class="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row"
				>
					<span class="text-xs font-bold tracking-widest text-muted-foreground uppercase">
						Need help getting started?
					</span>
					<div class="flex items-center gap-6">
						<a
							href="/download"
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							Setup Guide
						</a>
						<a
							href="mailto:support@aceblocker.com"
							class="text-sm text-muted-foreground transition-colors hover:text-foreground"
						>
							Help Center
						</a>
					</div>
				</div>
			</div>
		</div>
	</main>
{/if}

<style>
	:global(body) {
		background-color: var(--background);
	}
</style>
