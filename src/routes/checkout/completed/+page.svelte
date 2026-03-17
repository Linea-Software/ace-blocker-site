<script lang="ts">
	import { fade, fly, scale } from 'svelte/transition';
	import {
		CheckCircle,
		Copy,
		ExternalLink,
		Loader2,
		AlertCircle,
		ArrowRight,
		Check,
		Download,
		XCircle,
		LifeBuoy,
		Shield
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { page } from '$app/stores';
	import Navbar from '$lib/components/Navbar.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	// Use Svelte 5 derived rune to get status from URL
	const status = $derived($page.url.searchParams.get('status'));
	const isSuccess = $derived(status === 'active' || !status);
	const isFailed = $derived(status === 'failed');

	let isPro = $state(data.isPro);
	let verificationInProcess = $state(false);
	let copied = $state(false);
	let activationStatus = $state<'idle' | 'activating' | 'success' | 'failed'>('idle');
	let errorMessage = $state('');

	// Fail-safe verification check (only for success state)
	$effect(() => {
		if (isSuccess && !isPro && !verificationInProcess && data.success) {
			verifyProStatus();
		}
	});

	// Auto-activation trigger (only for success state)
	$effect(() => {
		if (isSuccess && isPro && activationStatus === 'idle' && data.apiKey) {
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
					isPro = true;
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
			const callbackUrl = encodeURIComponent(
				`${window.location.origin}${window.location.pathname}?activated=true`
			);
			const apiKey = data.apiKey;
			const localUrl = `https://ace-engine.local/account/api-key?apiKey=${apiKey}&callback=${callbackUrl}`;
			const protocolUrl = `aceblocker://account/api-key?apiKey=${apiKey}&callback=${callbackUrl}`;

			try {
				const localRes = await fetch(localUrl, { method: 'GET' });
				if (localRes.ok) {
					activationStatus = 'success';
				} else {
					window.location.href = protocolUrl;
					setTimeout(() => { if (activationStatus === 'activating') activationStatus = 'success'; }, 2000);
				}
			} catch (err) {
				window.location.href = protocolUrl;
				setTimeout(() => { if (activationStatus === 'activating') activationStatus = 'success'; }, 2000);
			}
		} catch (err) {
			console.error('Activation error:', err);
			activationStatus = 'failed';
			errorMessage = 'Could not automatically activate the app.';
		}
	}

	function copyToClipboard() {
		if (data.apiKey) {
			navigator.clipboard.writeText(data.apiKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<svelte:head>
	<title>{isFailed ? 'Payment Failed' : 'Payment Successful'} | Ace Blocker</title>
</svelte:head>

<Navbar />

<main class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background">
	<div class="relative flex min-h-[70vh] w-full flex-col items-center justify-center px-4 py-12">
		<!-- Resistance Mode Background Elements -->
		<div class="pointer-events-none absolute inset-0 overflow-hidden">
			<div class="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]"></div>
			<div class="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]"></div>
		</div>

		<div in:fly={{ y: 20, duration: 1000 }} class="relative z-10 w-full max-w-xl">
			<Card.Root class="overflow-hidden border-border/40 bg-card shadow-2xl">
				{#if isFailed}
					<!-- FAILURE UI -->
					<div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-destructive/40 to-transparent"></div>
					
					<Card.Header class="pb-4 pt-10 text-center">
						<div class="mb-6 flex justify-center">
							<div class="relative">
								<div class="absolute inset-0 animate-pulse rounded-full bg-destructive/20 opacity-20"></div>
								<div in:scale={{ duration: 600, delay: 200, start: 0.5 }} class="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
									<XCircle size={48} strokeWidth={1.5} />
								</div>
							</div>
						</div>
						<Card.Title class="text-3xl font-bold tracking-tight text-foreground">
							Payment Failed
						</Card.Title>
						<Card.Description class="mx-auto mt-2 max-w-sm text-balance text-base text-muted-foreground">
							We couldn't process your payment. Your card has not been charged.
						</Card.Description>
					</Card.Header>

					<Card.Content class="space-y-8 px-8 pb-8 pt-4">
						<div class="flex flex-col gap-3">
							<Button 
								href="/get-pro" 
								class="group h-12 w-full bg-amber-500 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-600 active:scale-[0.98]"
							>
								Try Again
								<ArrowRight class="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
							</Button>
							
							<Button 
								variant="outline" 
								href="mailto:support@aceblocker.com" 
								class="h-12 w-full border-border/60 bg-transparent text-foreground/80 hover:bg-white/5 active:scale-[0.98]"
							>
								<LifeBuoy class="mr-2 h-4 w-4 opacity-50" />
								Contact Support
							</Button>
						</div>
					</Card.Content>
				{:else if isSuccess}
					<!-- SUCCESS UI -->
					<div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent"></div>
					
					<Card.Header class="pb-4 pt-10 text-center">
						<div class="mb-6 flex justify-center">
							<div class="relative">
								<div class="absolute inset-0 animate-ping rounded-full bg-emerald-500/20 opacity-20"></div>
								<div in:scale={{ duration: 600, delay: 200, start: 0.5 }} class="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
									<CheckCircle size={48} strokeWidth={1.5} />
								</div>
							</div>
						</div>
						<Card.Title class="text-3xl font-bold tracking-tight text-foreground">
							Payment Successful!
						</Card.Title>
						<Card.Description class="mx-auto mt-2 max-w-sm text-balance text-base text-muted-foreground">
							Welcome to the Pro experience, {data.customerName}! Your account status is being synchronized.
						</Card.Description>
					</Card.Header>

					<Card.Content class="space-y-8 px-8 pb-8">
						<!-- License Status / Force Sync -->
						{#if !isPro}
							<div in:fade class="flex items-center justify-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200/80">
								<Loader2 class="h-4 w-4 animate-spin" />
								<span>Verifying your subscription status...</span>
							</div>
						{/if}

						<!-- API Key Section -->
						<div class="space-y-3">
							<div class="flex items-center justify-between px-1">
								<span class="text-[10px] font-bold tracking-[0.2em] text-muted-foreground uppercase">
									Your Device API Key
								</span>
								{#if copied}
									<span in:fade class="text-[10px] font-medium text-emerald-500 uppercase">Copied to clipboard</span>
								{/if}
							</div>
							
							<div class="group relative flex items-center overflow-hidden rounded-xl border border-border/50 bg-black/20 p-1 transition-colors hover:border-amber-500/30">
								<code class="flex-1 px-4 py-3 font-mono text-sm tracking-widest text-foreground/90 md:text-base">
									{data.apiKey || '••••-••••-••••-••••'}
								</code>
								<Button 
									variant="ghost" 
									size="icon" 
									onclick={copyToClipboard}
									class="h-10 w-10 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
								>
									{#if copied}
										<Check class="h-4 w-4" />
									{:else}
										<Copy class="h-4 w-4" />
									{/if}
								</Button>
							</div>
						</div>

						<!-- Activation Status -->
						<div class="flex flex-col items-center justify-center space-y-4 py-2">
							{#if activationStatus === 'activating'}
								<div in:fade class="flex items-center gap-3 text-sm font-medium text-muted-foreground/80">
									<Loader2 class="h-4 w-4 animate-spin text-amber-500" />
									<span>Launching Ace Blocker app...</span>
								</div>
							{:else if activationStatus === 'success'}
								<div in:fade class="flex items-center gap-2 text-sm font-medium text-emerald-400">
									<Check class="h-4 w-4" />
									<span>Successfully sent to app</span>
								</div>
							{/if}
						</div>

						<!-- Main Actions -->
						<div class="grid gap-3 sm:grid-cols-2">
							<Button 
								href="/download" 
								class="group h-12 w-full bg-amber-500 text-amber-950 shadow-[0_0_20px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-600 active:scale-[0.98]"
							>
								<Download class="mr-2 h-4 w-4" />
								Download App
							</Button>
							
							<Button 
								variant="outline" 
								href="/" 
								class="h-12 w-full border-border/60 bg-transparent text-foreground/80 hover:bg-white/5 active:scale-[0.98]"
							>
								Back to Home
								<ArrowRight class="ml-2 h-4 w-4 opacity-50" />
							</Button>
						</div>
					</Card.Content>
				{/if}

				<Card.Footer class="flex justify-center border-t border-border/40 bg-muted/30 py-4">
					<p class="text-[9px] font-medium tracking-[0.25em] text-muted-foreground/50 uppercase">
						ACE BLOCKER © 2026 • {isFailed ? 'PAYMENT GATEWAY' : 'SECURE LICENSE GATEWAY'}
					</p>
				</Card.Footer>
			</Card.Root>
		</div>
	</div>
</main>

<footer class="border-t border-slate-200 bg-slate-50 py-12 transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950">
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				<Shield class="h-7 w-7 text-primary dark:text-amber-500" />
				<span class="text-xl font-bold tracking-tight dark:text-white">{m.hero_title_app()}</span>
			</div>
			<p class="text-xs text-muted-foreground dark:text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-8">
				<a href="/terms" class="text-xs font-medium text-muted-foreground transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{m.footer_terms()}</a>
				<a href="/privacy" class="text-xs font-medium text-muted-foreground transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">{m.footer_privacy()}</a>
			</div>
		</div>
	</div>
</footer>

<style>
	:global(body) {
		background-color: hsl(var(--background));
	}
</style>
