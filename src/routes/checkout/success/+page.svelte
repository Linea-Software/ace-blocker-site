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
		Download
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	let isPro = $state(data.isPro);
	let verificationInProcess = $state(false);
	let copied = $state(false);
	let activationStatus = $state<'idle' | 'activating' | 'success' | 'failed'>('idle');
	let errorMessage = $state('');

	// Fail-safe verification check
	$effect(() => {
		if (!isPro && !verificationInProcess && data.success) {
			verifyProStatus();
		}
	});

	// Auto-activation trigger
	$effect(() => {
		if (isPro && activationStatus === 'idle' && data.apiKey) {
			// Small delay for visual polish
			const timer = setTimeout(activateInApp, 1000);
			return () => clearTimeout(timer);
		}
	});

	async function verifyProStatus() {
		verificationInProcess = true;
		try {
			// Adding a small delay to allow webhook processing just in case
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
				// Try the local engine first via HTTPS
				const localRes = await fetch(localUrl, { method: 'GET' });
				if (localRes.ok) {
					activationStatus = 'success';
				} else {
					window.location.href = protocolUrl;
					// We can't know for sure if the protocol link worked, but we set success after a delay
					setTimeout(() => { if (activationStatus === 'activating') activationStatus = 'success'; }, 2000);
				}
			} catch (err) {
				console.warn('Local engine activation failed, falling back to protocol:', err);
				window.location.href = protocolUrl;
				setTimeout(() => { if (activationStatus === 'activating') activationStatus = 'success'; }, 2000);
			}
		} catch (err) {
			console.error('Activation error:', err);
			activationStatus = 'failed';
			errorMessage = 'Could not automatically activate the app. Please try manually.';
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
	<title>Payment Successful | Ace Blocker</title>
</svelte:head>

<div class="relative flex min-h-[90vh] w-full flex-col items-center justify-center overflow-hidden bg-background px-4 py-20">
	<!-- Zen Background Elements -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		<div class="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]"></div>
		<div class="absolute -bottom-[10%] -right-[10%] h-[40%] w-[40%] rounded-full bg-amber-500/5 blur-[120px]"></div>
	</div>

	{#if data.success}
		<div in:fly={{ y: 20, duration: 1000 }} class="relative z-10 w-full max-w-xl">
			<Card.Root class="overflow-hidden border-border/40 bg-card shadow-2xl">
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
						<p class="px-1 text-[11px] leading-relaxed text-muted-foreground/60 italic">
							This key is used to link your desktop application. Keep it private.
						</p>
					</div>

					<!-- Activation Status / Loading Indicator -->
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
						{:else if activationStatus === 'failed'}
							<div in:fade class="flex flex-col items-center gap-2">
								<span class="text-xs text-destructive/80">{errorMessage}</span>
								<Button variant="link" size="sm" onclick={activateInApp} class="h-auto p-0 text-amber-500">
									Retry auto-activation
								</Button>
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
							<ArrowRight class="ml-2 h-4 w-4 opacity-50 group-hover:opacity-100" />
						</Button>
					</div>
				</Card.Content>

				<Card.Footer class="flex justify-center border-t border-border/40 bg-muted/30 py-4">
					<p class="text-[9px] font-medium tracking-[0.25em] text-muted-foreground/50 uppercase">
						ACE BLOCKER © 2026 • SECURE LICENSE GATEWAY
					</p>
				</Card.Footer>
			</Card.Root>
		</div>
	{:else}
		<!-- Error State -->
		<div in:fade class="w-full max-w-md text-center">
			<Card.Root class="border-destructive/20 bg-card">
				<Card.Header>
					<div class="mb-4 flex justify-center text-destructive">
						<AlertCircle size={48} strokeWidth={1.5} />
					</div>
					<Card.Title class="text-xl">Verification Issue</Card.Title>
					<Card.Description class="mt-2 text-muted-foreground">
						{data.error || 'We encountered an error retrieving your license details.'}
					</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button variant="outline" class="w-full" onclick={() => window.location.reload()}>
						Refresh Status
					</Button>
				</Card.Footer>
			</Card.Root>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background-color: hsl(var(--background));
	}
</style>
