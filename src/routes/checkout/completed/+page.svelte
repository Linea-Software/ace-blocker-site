<script lang="ts">
	import { fly } from 'svelte/transition';
	import { ShieldCheck, Download, CircleAlert } from '@lucide/svelte';
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();

	const status = $derived(page.url.searchParams.get('status'));
	const isSuccess = $derived(status === 'active' || !status);
	const isFailed = $derived(status === 'failed');

	const isPro = $derived(data.isPro);
	let verificationInProcess = $state(false);
	let activationStatus = $state<'idle' | 'activating' | 'success' | 'failed'>('idle');

	// Fail-safe verification check
	$effect(() => {
		if (isSuccess && !isPro && !verificationInProcess && data.success) {
			verifyProStatus();
		}
	});

	// Auto-activation trigger
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
	<title>{isFailed ? 'Protocol Interrupted' : 'System Activated'} | Ace Blocker</title>
</svelte:head>

<Navbar isPro={isPro} />

<main
	class="relative flex min-h-[calc(100vh-80px)] items-center justify-center overflow-hidden bg-[#0B0F19] p-4 selection:bg-amber-500/30 sm:p-8"
>
	<!-- Ambient Glow System -->
	<div class="pointer-events-none absolute inset-0 overflow-hidden">
		{#if !isFailed}
			<div
				class="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 opacity-50 blur-[120px]"
			></div>
			<div
				class="absolute top-[30%] right-[10%] h-[400px] w-[400px] rounded-full bg-amber-500/5 blur-[100px]"
			></div>
		{:else}
			<div
				class="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500/5 blur-[120px]"
			></div>
		{/if}
	</div>

	{#if isFailed}
		<!-- Premium Failure Card -->
		<div
			class="relative flex w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-[#111827] p-8 text-center shadow-2xl sm:p-12"
			in:fly={{ y: 20, duration: 800 }}
		>
			<!-- Header Section -->
			<div class="flex flex-col items-center">
				<div
					class="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10"
				>
					<CircleAlert class="h-10 w-10 text-red-500" />
				</div>
				<h1 class="mb-3 text-3xl font-extrabold tracking-tight text-white uppercase">
					{m.checkout_failed_title()}
				</h1>
				<p class="mx-auto max-w-md text-base leading-relaxed text-gray-400">
					{m.checkout_failed_subtitle()}
				</p>
			</div>

			<!-- Primary Action -->
			<div class="mt-8 flex w-full justify-center sm:mt-10">
				<a
					href="/get-pro"
					class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-8 py-3.5 text-base font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-400 sm:w-auto"
				>
					{m.checkout_retry_button()}
				</a>
			</div>

			<!-- Support Footer -->
			<div
				class="mt-10 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:mt-12 sm:flex-row"
			>
				<div class="text-xs font-bold tracking-widest text-gray-500 uppercase">
					{m.checkout_support_header()}
				</div>
				<div class="flex flex-wrap items-center justify-center gap-6">
					<a
						href="/support"
						class="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
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
							class="lucide lucide-user"
							><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle
								cx="12"
								cy="7"
								r="4"
							/></svg
						>
						{m.checkout_support_link()}
					</a>
					<a
						href="mailto:support@aceblocker.com"
						class="flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
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
							class="lucide lucide-mail"
							><rect width="20" height="16" x="2" y="4" rx="2" /><path
								d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"
							/></svg
						>
						{m.checkout_support_email()}
					</a>
				</div>
			</div>
		</div>
	{:else}
		<!-- Success Card -->
		<div
			class="relative flex w-full max-w-2xl flex-col rounded-[2.5rem] border border-white/10 bg-[#111827]/80 p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl transition-all duration-700 sm:p-14"
			in:fly={{ y: 20, duration: 800 }}
		>
			<!-- Header Section -->
			<div class="mb-2 flex flex-col items-center text-center">
				<div class="relative mb-6">
					<div
						class="absolute inset-0 scale-110 animate-pulse rounded-full bg-emerald-500/20 blur-2xl"
					></div>
					<div
						class="relative mx-auto inline-flex h-20 w-20 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-500/10"
					>
						<ShieldCheck class="h-10 w-10 text-emerald-500" />
					</div>
				</div>
				<h1 class="mb-3 text-center text-3xl font-extrabold tracking-tight text-white">
					{m.checkout_success_title()}
				</h1>
				<p class="mx-auto max-w-md text-center text-base leading-relaxed text-gray-400">
					{m.checkout_success_subtitle()}
				</p>
			</div>

			<!-- Inner System Well -->
			<div
				class="mt-10 flex flex-col divide-y divide-white/5 rounded-xl border border-white/5 bg-black/20"
			>
				<!-- Row 1: System Sync -->
				<div
					class="flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-6 sm:p-6"
				>
					<div class="flex-1 pr-0 sm:pr-4">
						<p
							class="mb-1.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase sm:text-xs"
						>
							{m.checkout_sync_header()}
						</p>
						<p class="text-sm leading-relaxed text-gray-300">
							{m.checkout_sync_description()}
						</p>
					</div>
					<div
						class="inline-flex shrink-0 items-center gap-2 rounded border border-white/10 bg-black/50 px-3 py-1.5 font-mono text-xs text-gray-300"
					>
						<span
							class="h-2 w-2 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
						></span>
						{m.checkout_sync_badge()}
					</div>
				</div>

				<!-- Row 2: App Control -->
				<div
					class="flex flex-col items-start justify-between gap-4 p-5 transition-colors hover:bg-white/[0.02] sm:flex-row sm:items-center sm:gap-6 sm:p-6"
				>
					<div class="flex-1 pr-0 sm:pr-4">
						<p
							class="mb-1.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase sm:text-xs"
						>
							{m.checkout_client_header()}
						</p>
						<p class="text-sm leading-relaxed text-gray-300">
							{m.checkout_client_description()}
						</p>
					</div>
					<a
						href="/download"
						class="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-bold text-black shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all hover:bg-amber-400 sm:w-auto"
					>
						<Download class="h-4 w-4" />
						{m.checkout_download_button()}
					</a>
				</div>
			</div>

			<!-- Return to Dashboard Action -->
			<a
				href="/"
				class="mt-6 flex w-full items-center justify-center rounded-xl border border-white/10 bg-transparent py-3.5 text-sm font-medium tracking-wide text-gray-400 transition-all hover:bg-white/5 hover:text-white"
			>
				{m.checkout_return_button()}
			</a>

			<!-- Resources Footer -->
			<div
				class="mt-8 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-6 sm:flex-row"
			>
				<div class="text-xs font-bold tracking-widest text-gray-500 uppercase">
					System Resources
				</div>
				<div class="flex items-center gap-6">
					<a
						href="/download"
						class="cursor-pointer text-sm text-gray-400 transition-colors hover:text-white"
					>
						Setup Guide
					</a>
					<a
						href="mailto:support@aceblocker.com"
						class="cursor-pointer text-sm text-gray-400 transition-colors hover:text-white"
					>
						Help Center
					</a>
				</div>
			</div>
		</div>
	{/if}
</main>

<style>
	:global(body) {
		background-color: #0b0f19;
	}
</style>
