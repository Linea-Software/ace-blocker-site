<script lang="ts">
	import { CheckCircle2, CircleAlert, Download, Loader2, RefreshCw } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import { invalidateAll } from '$app/navigation';
	import { apiClient } from '$lib/api-client';
	import { buildEngineLinkUrl } from '$lib/utils';
	import { pollForProConfirmation } from '$lib/utils/checkout-confirmation';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const status = $derived(page.url.searchParams.get('status'));
	const isSuccess = $derived(status === 'active' || !status);
	const isFailed = $derived(status === 'failed');

	const isPro = $derived(data.isPro);
	let confirmationState = $state<'checking' | 'pending' | 'error'>('checking');
	let verificationBusy = false;
	let verificationAbort: AbortController | null = null;
	let activationStatus = $state<'idle' | 'activating' | 'pending' | 'failed'>('idle');

	const pageTitle = $derived(
		isFailed ? m.checkout_page_title_failed() : m.checkout_page_title_success()
	);

	onMount(() => {
		if (isSuccess && !isPro && data.success) void verifyProStatus();
		return () => verificationAbort?.abort();
	});

	// Do not trigger an external-protocol browser popup automatically.
	// New desktop clients authorize through /connect using device linking.

	function waitForVerification(signal: AbortSignal): Promise<void> {
		return new Promise((resolve, reject) => {
			if (signal.aborted) return reject(new Error('Verification cancelled'));
			const onAbort = () => {
				clearTimeout(timer);
				reject(new Error('Verification cancelled'));
			};
			const timer = setTimeout(() => {
				signal.removeEventListener('abort', onAbort);
				resolve();
			}, 2000);
			signal.addEventListener('abort', onAbort, { once: true });
		});
	}

	async function verifyProStatus() {
		if (verificationBusy) return;
		verificationBusy = true;
		confirmationState = 'checking';
		verificationAbort?.abort();
		const controller = new AbortController();
		verificationAbort = controller;
		try {
			const outcome = await pollForProConfirmation(
				async () => {
					// Bound each request: an unreachable provider should not leave
					// checkout stuck on a spinner indefinitely.
					const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
					const res = await fetch('/api/v1/account/verify-pro', {
						method: 'POST',
						signal
					});
					if (!res.ok) throw new Error(`Verification returned HTTP ${res.status}`);
					const result: { isActive: boolean } = await res.json();
					return result.isActive;
				},
				() => waitForVerification(controller.signal)
			);
			if (controller.signal.aborted) return;
			if (outcome === 'active') await invalidateAll();
			else confirmationState = 'pending';
		} catch (error) {
			if (!controller.signal.aborted) {
				console.error('Pro verification failed', error);
				confirmationState = 'error';
			}
		} finally {
			verificationBusy = false;
		}
	}

	async function activateInApp() {
		activationStatus = 'activating';
		try {
			const { data: keyData, error: keyError } =
				await apiClient.v1.account['api-key'].create.get();
			if (keyError) throw new Error((keyError.value as string) || 'Failed to create API key');
			if (!keyData) throw new Error('Failed to create API key');
			const apiKey = keyData.apiKey;

			// The desktop engine uses typed IPC, not a browser-accessible HTTP port.
			// Dispatching a protocol URL only requests delivery; there is no app
			// acknowledgement available to this page.
			window.location.href = buildEngineLinkUrl(apiKey);
			activationStatus = 'pending';
		} catch (err) {
			console.error('Activation error:', err);
			activationStatus = 'failed';
		}
	}
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={m.page_description_checkout_completed()} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={m.page_description_checkout_completed()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="robots" content="noindex, nofollow" />
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={m.page_description_checkout_completed()} />
</svelte:head>

<Navbar {isPro} />

{#if isFailed}
	<main id="main-content">
		<section class="border-b border-border">
			<div
				class="ace-shell grid gap-10 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:py-20"
			>
				<div>
					<div
						class="mb-7 flex size-11 items-center justify-center rounded-md border border-danger/35 bg-danger/10 text-danger"
					>
						<CircleAlert class="size-5" aria-hidden="true" />
					</div>
					<h1
						class="font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
					>
						{m.checkout_failed_title()}
					</h1>
				</div>
				<div class="max-w-2xl">
					<p class="text-lg leading-relaxed text-muted-foreground">
						{m.checkout_failed_subtitle()}
					</p>
					<a
						href={resolve('/get-pro')}
						class="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
					>
						{m.checkout_retry_button()}
					</a>
				</div>
			</div>
		</section>

		<section class="bg-card">
			<div class="ace-shell grid gap-6 py-10 sm:grid-cols-[0.45fr_1fr] sm:items-start">
				<p class="font-display text-xl font-semibold">{m.checkout_support_header()}</p>
				<div class="flex flex-wrap gap-x-7 gap-y-3 text-sm">
					<a href="mailto:support@aceblocker.com" class="font-medium hover:underline"
						>{m.checkout_support_link()}</a
					>
					<a
						href="mailto:support@aceblocker.com"
						class="text-muted-foreground hover:text-foreground hover:underline"
					>
						{m.checkout_support_email()}
					</a>
				</div>
			</div>
		</section>
	</main>
{:else if !isPro}
	<main id="main-content" class="ace-shell min-h-[55vh] py-16 sm:py-24">
		<div class="max-w-2xl border-l-4 border-signal pl-6">
			{#if data.success && confirmationState === 'checking'}
				<Loader2
					class="size-6 animate-spin text-signal-deep dark:text-signal"
					aria-hidden="true"
				/>
			{:else}
				<CircleAlert class="size-6 text-signal-deep dark:text-signal" aria-hidden="true" />
			{/if}
			<h1 class="mt-5 font-display text-4xl font-semibold">
				{data.success && confirmationState === 'checking'
					? m.checkout_pending_title()
					: m.checkout_pending_delayed_title()}
			</h1>
			<p class="mt-4 text-muted-foreground" role="status">
				{!data.success || confirmationState === 'error'
					? m.checkout_pending_error_description()
					: confirmationState === 'pending'
						? m.checkout_pending_delayed_description()
						: m.checkout_pending_description()}
			</p>
			<div class="mt-7 flex flex-wrap gap-3">
				{#if data.success && confirmationState !== 'checking'}
					<button
						type="button"
						onclick={verifyProStatus}
						class="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
					>
						<RefreshCw class="size-4" aria-hidden="true" />
						{m.checkout_pending_retry()}
					</button>
				{/if}
				<a
					href={resolve('/account')}
					class="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-medium"
					>{m.checkout_pending_account()}</a
				>
			</div>
		</div>
	</main>
{:else}
	<main id="main-content">
		<section class="border-b border-border">
			<div
				class="ace-shell grid gap-10 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:py-20"
			>
				<div>
					<div
						class="mb-7 flex size-11 items-center justify-center rounded-md border border-success/35 bg-success/10 text-success"
					>
						<CheckCircle2 class="size-5" aria-hidden="true" />
					</div>
					<p class="font-mono text-xs text-success">{m.checkout_pro_active()}</p>
					<h1
						class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
					>
						{m.checkout_success_title()}
					</h1>
				</div>
				<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground">
					{m.checkout_success_subtitle()}
				</p>
			</div>
		</section>

		<section class="border-b border-border bg-card py-12 sm:py-16">
			<div class="ace-shell">
				<h2 class="mb-6 font-display text-3xl font-semibold">{m.checkout_next_title()}</h2>
				<div class="overflow-hidden rounded-lg border border-border bg-background">
					<div
						class="grid gap-5 border-b border-border p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6"
					>
						<div>
							<p class="font-display text-xl font-semibold">
								{m.checkout_sync_header()}
							</p>
							<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
								{m.checkout_sync_description()}
							</p>
						</div>
						<div
							class={[
								'inline-flex min-h-10 w-fit items-center gap-2 rounded-md border px-3 font-mono text-xs',
								activationStatus === 'failed'
									? 'border-danger/35 bg-danger/10 text-danger'
									: activationStatus === 'pending'
										? 'border-information/35 bg-information/10 text-information'
										: 'border-information/35 bg-information/10 text-information'
							]}
							aria-live="polite"
						>
							{#if activationStatus === 'activating'}
								<Loader2 class="size-3.5 animate-spin" aria-hidden="true" />
								{m.checkout_activation_activating()}
							{:else if activationStatus === 'pending'}
								<CircleAlert class="size-3.5" aria-hidden="true" />
								{m.checkout_activation_pending()}
							{:else if activationStatus === 'failed'}
								<CircleAlert class="size-3.5" aria-hidden="true" />
								{m.checkout_activation_failed()}
							{:else}
								{m.checkout_activation_idle()}
							{/if}
						</div>
					</div>

					<div class="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
						<div>
							<p class="font-display text-xl font-semibold">
								{m.checkout_client_header()}
							</p>
							<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
								{m.checkout_client_description()}
							</p>
						</div>
						<a
							href={resolve('/download')}
							class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-foreground/30 px-4 text-sm font-medium hover:bg-accent sm:w-auto"
						>
							<Download class="size-4" aria-hidden="true" />
							{m.checkout_download_button()}
						</a>
					</div>
				</div>

				{#if activationStatus === 'pending'}
					<p
						class="mt-4 max-w-3xl border-l-4 border-information bg-information/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
						role="status"
					>
						{m.checkout_activation_pending_detail()}
					</p>
				{/if}
				{#if activationStatus === 'idle' || activationStatus === 'failed' || activationStatus === 'pending'}
					<button
						type="button"
						onclick={activateInApp}
						class="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
					>
						<RefreshCw class="size-4" aria-hidden="true" />
						{m.checkout_activation_retry()}
					</button>
				{/if}
			</div>
		</section>

		<section>
			<div class="ace-shell grid gap-8 py-10 md:grid-cols-[0.55fr_1fr] md:items-start">
				<div>
					<p class="font-display text-xl font-semibold">{m.checkout_status_title()}</p>
					<p class="mt-2 font-mono text-xs text-success">{m.checkout_sync_badge()}</p>
				</div>
				<div>
					<a
						href={resolve('/')}
						class="inline-flex min-h-11 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
					>
						{m.checkout_return_button()}
					</a>
					<div
						class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-5 text-sm"
					>
						<span class="font-medium">{m.checkout_help_title()}</span>
						<a
							href={resolve('/download')}
							class="text-muted-foreground hover:text-foreground hover:underline"
						>
							{m.checkout_setup_guide()}
						</a>
						<a
							href="mailto:support@aceblocker.com"
							class="text-muted-foreground hover:text-foreground hover:underline"
						>
							{m.checkout_help_center()}
						</a>
					</div>
				</div>
			</div>
		</section>
	</main>
{/if}

<MarketingFooter />
