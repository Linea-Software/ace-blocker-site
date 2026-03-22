<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as m from '$lib/paraglide/messages';
	import {
		IconBrandWindows,
		IconBrandUbuntu,
		IconBrandApple,
		IconDownload,
		IconFileText,
		IconShieldCheck,
		IconExternalLink
	} from '@tabler/icons-svelte';
	import MoveLeft from '@lucide/svelte/icons/move-left';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { onMount, type Component } from 'svelte';
	import { fade, fly } from 'svelte/transition';

	let { data } = $props();

	// Svelte 5 state management
	let arch = $derived(page.url.searchParams.get('arch') || 'windows');
	let downloadStarted = $state(false);
	let dots = $state('');
	let isManualLoading = $state(false);
	let showChecksums = $state(false);
	let detectedArch = $state('windows');

	// Active "downloading" animation for the title
	$effect(() => {
		const interval = setInterval(() => {
			dots = dots.length >= 3 ? '' : dots + '.';
		}, 500);
		return () => clearInterval(interval);
	});

	onMount(() => {
		// Detect platform for recommendation
		if (typeof window !== 'undefined') {
			const platform = window.navigator.platform.toLowerCase();
			const ua = window.navigator.userAgent.toLowerCase();

			if (platform.includes('win') || ua.includes('windows')) {
				detectedArch = 'windows';
			} else if (platform.includes('mac') || ua.includes('macintosh')) {
				detectedArch = 'macos_universal';
			} else if (platform.includes('linux') || ua.includes('linux')) {
				detectedArch = 'linux_x64';
			}

			// Automatically trigger download on first arrival
			if (!downloadStarted) {
				downloadStarted = true;
				setTimeout(() => {
					window.location.href = `/download/${arch}`;
				}, 2000);
			}
		}
	});

	interface PlatformOption {
		id: string;
		name: string;
		icon: any;
		size: string;
		ext: string;
		details: string;
		isAvailable: boolean;
	}

	let formattedSize = $derived(data.installer ? (data.installer.size / (1024 * 1024)).toFixed(1) + 'MB' : '12MB');

	let platformOptions: PlatformOption[] = $derived([
		{
			id: 'windows',
			name: 'Windows',
			icon: IconBrandWindows,
			size: formattedSize,
			ext: '.exe',
			details: 'x64 Installer',
			isAvailable: data.installer?.os === 'windows' || data.installer === undefined
		},
		{
			id: 'macos',
			name: 'macOS',
			icon: IconBrandApple,
			size: formattedSize,
			ext: '.dmg',
			details: 'Universal Binary',
			isAvailable: data.installer?.os === 'macos' || data.installer === undefined
		},
		{
			id: 'linux',
			name: 'Linux',
			icon: IconBrandUbuntu,
			size: formattedSize,
			ext: '.deb',
			details: 'Debian / Ubuntu',
			isAvailable: data.installer?.os === 'linux' || data.installer === undefined
		}
	]);

	function handleManualDownload() {
		isManualLoading = true;
		window.location.href = `/download/${arch}`;
		// Reset loading state after some time
		setTimeout(() => {
			isManualLoading = false;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Download Ace Blocker</title>
</svelte:head>

<Navbar />

<main
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-white px-4 pt-16 pb-12 transition-colors duration-500 dark:bg-[#0B0B0F]"
>
	<!-- Background Aesthetics (Resistance Mode Theme) -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-slate-50 transition-colors duration-500 dark:bg-[#0B0B0F]"
	>
		<div
			class="absolute inset-0 bg-radial-[at_50%_50%] from-slate-50 via-slate-50 to-amber-500/5 dark:from-[#0B0B0F] dark:via-[#0B0B0F] dark:to-amber-500/10"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/50 blur-[120px] dark:bg-primary/10"
		></div>

		<!-- Subtle Moving Orbs -->
		<div
			class="absolute -top-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-amber-500/5 blur-[100px]"
		></div>
		<div
			class="absolute -right-24 -bottom-24 h-96 w-96 animate-pulse rounded-full bg-blue-500/5 blur-[100px]"
			style="animation-delay: 2s;"
		></div>
	</div>

	<div class="w-full max-w-4xl space-y-20 text-center">
		<!-- Hero Section -->
		<div class="space-y-10" in:fade={{ delay: 100, duration: 800 }}>
			<div class="flex justify-center">
				<div class="group relative">
					<!-- Pulsing Glow Indicating Active Processing -->
					<div
						class="absolute inset-0 animate-pulse rounded-full bg-amber-500/20 blur-2xl transition-all duration-500 group-hover:bg-amber-500/30"
					></div>
					<div
						class="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-slate-200 bg-white text-amber-500 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-2xl"
					>
						<IconDownload size={44} stroke={1.5} />
					</div>
				</div>
			</div>

			<div class="space-y-4">
				<h1 class="text-4xl font-black tracking-tighter text-slate-900 md:text-7xl dark:text-white">
					{m.download_title().replace('...', '')}<span
						class="inline-block w-[1em] text-left text-amber-500 dark:text-amber-400">{dots}</span
					>
				</h1>
				<p
					class="mx-auto max-w-xl text-lg font-medium tracking-tight text-slate-600 opacity-80 sm:text-xl dark:text-slate-400"
				>
					{m.download_description()}
				</p>
			</div>

			<div class="flex flex-col items-center gap-6">
				<Button
					size="lg"
					onclick={handleManualDownload}
					disabled={isManualLoading}
					class="relative h-14 overflow-hidden rounded-full bg-amber-500 px-10 text-lg font-bold text-black shadow-xl shadow-amber-500/20 transition-all hover:scale-105 hover:bg-amber-400 active:scale-95 dark:shadow-amber-500/10"
				>
					{#if isManualLoading}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					{:else}
						<IconDownload class="mr-2 h-5 w-5" />
					{/if}
					{m.download_manual_button()}
				</Button>

				<a
					href="https://github.com/aintDatCap/ace-blocker/releases"
					target="_blank"
					class="group flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-all hover:text-amber-500 dark:text-slate-400"
				>
					<IconFileText size={16} class="transition-transform group-hover:rotate-12" />
					Version {data.installer?.version} - Build Notes
					<IconExternalLink
						size={12}
						class="opacity-0 transition-opacity group-hover:opacity-100"
					/>
				</a>
			</div>
		</div>

		<!-- Platform Bento Grid -->
		<div class="space-y-10">
			<div class="flex items-center gap-4 px-4">
				<div
					class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800"
				></div>
				<span
					class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-500"
					>{m.download_other_arch_title()}</span
				>
				<div
					class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800"
				></div>
			</div>

			<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
				{#each platformOptions as option (option.id)}
					{@const isRecommended = detectedArch === option.id && option.isAvailable}
					{@const PlatformIcon = option.icon}
					<div class="group relative">
						<a
							href={option.isAvailable ? `/download/${option.id}` : undefined}
							class="relative flex flex-col items-start gap-5 rounded-[2.5rem] p-8 text-left transition-all duration-500
								{option.isAvailable
								? 'hover:scale-[1.02] active:scale-[0.98]'
								: 'cursor-not-allowed opacity-50 grayscale'}
								{isRecommended
								? 'border-2 border-amber-500/50 bg-amber-50 shadow-2xl shadow-amber-500/10 dark:bg-amber-500/5'
								: 'border border-slate-200 bg-white shadow-sm hover:border-amber-500/30 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5 dark:hover:shadow-xl'}"
							aria-disabled={!option.isAvailable}
						>
							{#if isRecommended}
								<div
									class="absolute top-6 right-8 rounded-full bg-amber-500 px-3 py-1 text-[10px] font-black tracking-wider text-black uppercase shadow-lg"
								>
									Recommended
								</div>
							{/if}

							<div
								class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/50 {option.isAvailable
									? 'group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/30 dark:group-hover:text-black'
									: ''}"
							>
								<PlatformIcon size={32} stroke={1.5} />
							</div>

							<div class="space-y-1">
								<h3 class="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
									{option.name}
								</h3>
								<p class="text-sm font-bold text-slate-500 dark:text-slate-400">{option.details}</p>
							</div>

							<div
								class="mt-4 flex w-full items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800"
							>
								<span
									class="text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500"
									>{option.size}</span
								>
								<span
									class="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
								>
									{option.ext}
								</span>
							</div>
						</a>

						{#if !option.isAvailable}
							<div
								class="pointer-events-none absolute inset-0 flex items-center justify-center rounded-[2.5rem] bg-white/50 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100 dark:bg-black/50"
							>
								<div
									class="rounded-full bg-amber-500 px-4 py-2 text-xs font-black tracking-[0.2em] text-black uppercase shadow-xl shadow-amber-500/40"
								>
									Coming Soon
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer Info & Utils -->
		<div class="mx-auto max-w-2xl space-y-16">
			<!-- System Requirements -->
			<div
				class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-10 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/20 dark:hover:border-slate-700 dark:hover:bg-slate-900/40"
			>
				<div class="flex flex-col items-center gap-6 text-center">
					<div
						class="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500"
					>
						<IconShieldCheck size={24} />
					</div>
					<div class="space-y-2">
						<h4
							class="text-[10px] font-black tracking-[0.3em] text-slate-500 uppercase dark:text-slate-400"
						>
							{m.download_sys_req_title()}
						</h4>
						<p class="text-xl font-black tracking-tight text-slate-900 dark:text-white">
							{m.download_sys_req_details()}
						</p>
					</div>
				</div>
			</div>

			<!-- Checksums Toggle (Security Conscious) -->
			<div class="space-y-4 px-4">
				<button
					onclick={() => (showChecksums = !showChecksums)}
					class="group flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-6 py-4 text-left shadow-sm transition-all hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/10 dark:hover:bg-slate-900/30"
				>
					<span
						class="text-sm font-black tracking-widest text-slate-700 uppercase group-hover:text-amber-500 dark:text-slate-300"
						>{m.download_checksums_toggle()}</span
					>
					<div
						class="text-muted-foreground transition-transform duration-300"
						class:rotate-180={showChecksums}
					>
						<ChevronDown size={20} />
					</div>
				</button>

				{#if showChecksums}
					<div
						transition:fade={{ duration: 300 }}
						class="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-8 text-left dark:border-slate-800 dark:bg-slate-900/20"
					>
						<div class="space-y-6 font-mono text-[10px]">
							<div class="space-y-2">
								<p class="font-black tracking-widest text-amber-500/70 uppercase">
									Windows (x64) SHA-256
								</p>
								<p
									class="rounded-xl border border-slate-200 bg-white p-4 break-all text-slate-600 select-all dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400"
								>
									TODO
								</p>
							</div>
							<div class="space-y-2">
								<p class="font-black tracking-widest text-blue-500/70 uppercase">
									Linux (x64) SHA-256
								</p>
								<p
									class="rounded-xl border border-slate-200 bg-white p-4 break-all text-slate-600 select-all dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400"
								>
									TODO
								</p>
							</div>
						</div>
					</div>
				{/if}
			</div>

			<!-- Home Navigation -->
			<div class="pt-8">
				<Button
					variant="ghost"
					href="/"
					class="group h-12 rounded-full border border-transparent px-8 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 dark:text-slate-400"
				>
					<MoveLeft class="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-2" />
					{m.download_back_home()}
				</Button>
			</div>
		</div>
	</div>
</main>
