<script lang="ts">
	import { onMount } from 'svelte';
	import { fade, fly, scale } from 'svelte/transition';
	import { CheckCircle2, Copy, ExternalLink, Loader2, AlertCircle } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props();

	let activationStatus = $state<'idle' | 'activating' | 'success' | 'failed'>('idle');
	let errorMessage = $state('');
	let copied = $state(false);

	onMount(() => {
		const urlParams = new URLSearchParams(window.location.search);
		const isActivated = urlParams.get('activated') === 'true';

		if (isActivated) {
			activationStatus = 'success';
			return;
		}

		if (data.success && data.licenseKey && data.apiKey) {
			// Wait a bit for the animation before trying to activate
			setTimeout(activateLicense, 1500);
		}
	});

	async function activateLicense() {
		if (!data.licenseKey) return;

		activationStatus = 'activating';
		try {
			const callbackUrl = encodeURIComponent(
				`${window.location.origin}${window.location.pathname}?activated=true`
			);
			window.location.href = `aceblocker://licence/activate?licenceKey=${data.licenseKey}&apiKey=${data.apiKey}&callback=${callbackUrl}`;
		} catch (err) {
			console.error('Activation error:', err);
			activationStatus = 'failed';
			errorMessage =
				'Could not automatically activate the app. Please try manually or copy the key.';
		}
	}
	function copyToClipboard() {
		if (data.licenseKey) {
			navigator.clipboard.writeText(data.licenseKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}
</script>

<svelte:head>
	<title>Checkout Successful | Ace Blocker</title>
</svelte:head>

<div
	class="relative container flex min-h-[80vh] flex-col items-center justify-center overflow-hidden px-4 py-12"
>
	<!-- Background Decoration -->
	<div
		class="absolute top-1/4 left-1/4 -z-10 h-64 w-64 animate-pulse rounded-full bg-primary/5 blur-3xl"
	></div>
	<div
		class="absolute right-1/4 bottom-1/4 -z-10 h-96 w-96 animate-pulse rounded-full bg-blue-500/5 blur-3xl"
		style="animation-delay: 1s"
	></div>

	{#if data.success}
		<div in:fly={{ y: 20, duration: 800 }} class="w-full max-w-lg">
			<Card.Root class="border-border/50 bg-background/50 shadow-2xl backdrop-blur-xl">
				<Card.Header class="pb-2 text-center">
					<div class="mb-6 flex justify-center">
						<div class="relative">
							<div
								class="absolute inset-0 scale-150 animate-pulse rounded-full bg-primary/20 blur-xl"
							></div>
							<div
								in:scale={{ duration: 600, delay: 200, start: 0.5 }}
								class="relative rounded-full bg-primary p-4 text-primary-foreground shadow-lg"
							>
								<CheckCircle2 size={48} strokeWidth={2.5} />
							</div>
						</div>
					</div>
					<Card.Title class="mb-2 text-3xl font-bold tracking-tight">Payment Successful!</Card.Title
					>
					<Card.Description class="text-base">
						Thank you for upgrading, {data.customerName}! Your account is now Pro.
					</Card.Description>
				</Card.Header>

				<Card.Content class="space-y-6 pt-6">
					<div
						class="group relative overflow-hidden rounded-2xl border border-border/50 bg-muted/30 p-6"
					>
						<div class="relative z-10">
							<p class="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
								Your License Key
							</p>
							<div class="flex items-center gap-3">
								<code
									class="flex-1 rounded-lg border border-border/50 bg-background/80 px-4 py-3 font-mono text-lg font-bold tracking-wider select-all"
								>
									{data.licenseKey}
								</code>
								<Button
									variant="secondary"
									size="icon"
									onclick={copyToClipboard}
									class="h-12 w-12 shrink-0 transition-all active:scale-90"
								>
									{#if copied}
										<CheckCircle2 class="text-green-500" size={20} />
									{:else}
										<Copy size={20} />
									{/if}
								</Button>
							</div>
						</div>
					</div>

					<div
						class="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/100 bg-primary/5 p-4"
					>
						{#if activationStatus === 'activating'}
							<div
								class="flex animate-in items-center gap-3 font-medium text-primary duration-300 fade-in"
							>
								<Loader2 class="animate-spin" size={20} />
								<span>Launching Ace Blocker app...</span>
							</div>
						{:else if activationStatus === 'success'}
							<div
								class="flex animate-in items-center gap-2 font-medium text-green-600 duration-300 zoom-in-95 dark:text-green-400"
							>
								<CheckCircle2 size={20} />
								<span>App activated successfully!</span>
							</div>
						{:else if activationStatus === 'failed'}
							<div class="w-full space-y-3 text-center">
								<p class="text-sm text-muted-foreground">
									If the app didn't open automatically, use the button below.
								</p>
								<Button
									class="w-full gap-2 py-6 text-lg font-semibold shadow-lg transition-all hover:shadow-primary/20"
									onclick={activateLicense}
								>
									<ExternalLink size={20} />
									Activate in App
								</Button>
								<p class="mt-2 flex items-center justify-center gap-1 text-xs text-destructive">
									<AlertCircle size={12} />
									{errorMessage}
								</p>
							</div>
						{:else}
							<Button
								variant="outline"
								class="w-full gap-2 border-primary/20 hover:bg-primary/5"
								onclick={activateLicense}
							>
								<ExternalLink size={18} />
								Re-run Auto-activation
							</Button>
						{/if}
					</div>
				</Card.Content>

				<Card.Footer class="flex flex-col gap-4 border-t border-border/50 pt-6">
					<div class="grid w-full grid-cols-2 gap-3">
						<Button variant="outline" href="/download" class="h-11 w-full">Download App</Button>
						<Button href="/" class="h-11 w-full">Back to Home</Button>
					</div>
					<p class="px-8 text-center text-[10px] tracking-widest text-muted-foreground uppercase">
						Ace Blocker © 2026 • Secure License Activation
					</p>
				</Card.Footer>
			</Card.Root>
		</div>
	{:else}
		<div in:fade class="w-full max-w-md text-center">
			<Card.Root class="border-destructive/20 bg-destructive/5 backdrop-blur-sm">
				<Card.Header>
					<div class="mb-4 flex justify-center">
						<AlertCircle class="text-destructive" size={48} />
					</div>
					<Card.Title>License Retrieval Issue</Card.Title>
					<Card.Description>{data.error || 'Something went wrong.'}</Card.Description>
				</Card.Header>
				<Card.Footer>
					<Button variant="outline" class="h-11 w-full" onclick={() => window.location.reload()}
						>Try Again</Button
					>
				</Card.Footer>
			</Card.Root>
		</div>
	{/if}
</div>

<style>
	:global(body) {
		background:
			radial-gradient(circle at top center, hsl(var(--primary) / 0.05) 0%, transparent 70%),
			radial-gradient(circle at bottom right, hsl(var(--primary) / 0.03) 0%, transparent 50%),
			hsl(var(--background));
		min-height: 100vh;
	}
</style>
