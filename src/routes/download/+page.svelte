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
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';

	let { data } = $props();

	// Map display arch IDs (used in UI) to the route-compatible arch strings
	const ARCH_IDS: Record<string, string> = {
		windows: 'windows_x64',
		macos: 'macos_universal',
		linux: 'linux_x64'
	};

	const DISPLAY_ARCH = page.url.searchParams.get('arch') || 'windows_x64';
	let arch = $state(DISPLAY_ARCH);
	let downloadStarting = $state(false);
	let isManualLoading = $state(false);
	let showChecksums = $state(false);
	let detectedArch = $state('windows_x64');

	onMount(() => {
		// Detect platform for recommendation
		if (typeof window !== 'undefined') {
			const platform = window.navigator.platform.toLowerCase();
			const ua = window.navigator.userAgent.toLowerCase();

			if (platform.includes('win') || ua.includes('windows')) {
				detectedArch = 'windows_x64';
			} else if (platform.includes('mac') || ua.includes('macintosh')) {
				detectedArch = 'macos_universal';
			} else if (platform.includes('linux') || ua.includes('linux')) {
				detectedArch = 'linux_x64';
			}

			// Automatically trigger download on first arrival (only if installer available)
			if (!downloadStarting && data.installer) {
				downloadStarting = true;
				setTimeout(() => {
					window.location.href = `/download/${arch}`;
				}, 2000);
			}
		}
	});

	interface PlatformOption {
		id: string;
		routeArch: string;
		name: string;
		icon: any;
		size: string;
		ext: string;
		details: string;
		isAvailable: boolean;
	}

	let formattedSize = $derived(
		data.installer ? Math.round(data.installer.size / 1024 / 1024) + 'MB' : null
	);

	let platformOptions: PlatformOption[] = $derived([
		{
			id: 'windows',
			routeArch: 'windows_x64',
			name: 'Windows',
			icon: IconBrandWindows,
			size: formattedSize ?? '—',
			ext: '.exe',
			details: 'x64 Installer',
			isAvailable: data.installer?.os === 'windows' || !data.installer
		},
		{
			id: 'macos',
			routeArch: 'macos_universal',
			name: 'macOS',
			icon: IconBrandApple,
			size: '—',
			ext: '.dmg',
			details: 'Universal Binary',
			isAvailable: data.installer?.os === 'macos'
		},
		{
			id: 'linux',
			routeArch: 'linux_x64',
			name: 'Linux',
			icon: IconBrandUbuntu,
			size: '—',
			ext: '.deb',
			details: 'Debian / Ubuntu',
			isAvailable: data.installer?.os === 'linux'
		}
	]);

	function handleManualDownload() {
		isManualLoading = true;
		window.location.href = `/download/${arch}`;
		setTimeout(() => {
			isManualLoading = false;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Download Ace Blocker</title>
</svelte:head>

<Navbar isPro={data.isPro} />

<main
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 pt-16 pb-12 transition-colors duration-500 dark:bg-[#0B0B0F]"
>
	<!-- Background Aesthetics (Resistance Mode Theme) -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-background transition-colors duration-500 dark:bg-[#0B0B0F]"
	>
		<div
			class="absolute inset-0 bg-radial-[at_50%_50%] from-background via-background to-amber-500/5 dark:from-[#0B0B0F] dark:via-[#0B0B0F] dark:to-amber-500/10"
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
						class="absolute inset-0 animate-pulse rounded-2xl bg-amber-500/20 blur-2xl transition-all duration-500 group-hover:bg-amber-500/30"
					></div>
					<div
						class="relative flex h-24 w-24 items-center justify-center rounded-2xl border border-slate-200 bg-white text-amber-500 shadow-xl shadow-slate-200/50 backdrop-blur-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-amber-500/50 dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-2xl"
					>
						<IconDownload size={44} stroke={1.5} />
					</div>
				</div>
			</div>

			<div class="space-y-4">
				<h1
					class="text-4xl font-black tracking-tighter text-slate-900 md:text-7xl dark:text-white"
				>
					{m.download_title().replace('...', '')}
				</h1>

				{#if downloadStarting}
					<p
						class="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-500"
					>
						<Loader2 class="h-4 w-4 animate-spin" />
						Your download is starting…
					</p>
				{:else}
					<p
						class="mx-auto max-w-xl text-lg font-medium tracking-tight text-slate-600 opacity-80 sm:text-xl dark:text-slate-400"
					>
						{m.download_description()}
					</p>
				{/if}
			</div>

			<div class="flex flex-col items-center gap-6">
				<Button
					size="lg"
					onclick={handleManualDownload}
					disabled={isManualLoading || !data.installer}
					class="relative h-14 overflow-hidden rounded-lg bg-amber-500 px-10 text-lg font-bold text-black shadow-xl shadow-amber-500/20 transition-all hover:scale-105 hover:bg-amber-400 active:scale-95 dark:shadow-amber-500/10"
				>
					{#if isManualLoading}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					{:else}
						<IconDownload class="mr-2 h-5 w-5" />
					{/if}
					{m.download_manual_button()}
				</Button>

				{#if data.installer}
					<a
						href="https://github.com/aintDatCap/ace-blocker/releases"
						target="_blank"
						class="group flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-all hover:text-amber-500 dark:text-slate-400"
					>
						<IconFileText
							size={16}
							class="transition-transform group-hover:rotate-12"
						/>
						Version {data.installer.version} - Build Notes
						<IconExternalLink
							size={12}
							class="opacity-0 transition-opacity group-hover:opacity-100"
						/>
					</a>
				{/if}
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
					{@const isRecommended = detectedArch === option.routeArch && option.isAvailable}
					{@const PlatformIcon = option.icon}
					<div class="group relative" class:opacity-60={!option.isAvailable}>
						<a
							href={option.isAvailable ? `/download/${option.routeArch}` : undefined}
							class="relative flex flex-col items-start gap-5 rounded-2xl p-8 text-left transition-all duration-500
								{option.isAvailable ? 'hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}
								{isRecommended
								? 'border-2 border-amber-500/50 bg-amber-50 shadow-2xl shadow-amber-500/10 dark:bg-amber-500/5'
								: 'border border-slate-200 bg-white shadow-sm hover:border-amber-500/30 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-amber-500/30 dark:hover:bg-amber-500/5 dark:hover:shadow-xl'}"
							aria-disabled={!option.isAvailable}
						>
							{#if isRecommended}
								<div
									class="absolute top-6 right-8 rounded-md bg-amber-500 px-3 py-1 text-[10px] font-black tracking-wider text-black uppercase shadow-lg"
								>
									Recommended
								</div>
							{/if}

							{#if !option.isAvailable}
								<div
									class="absolute top-6 right-8 rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
								>
									Coming soon
								</div>
							{/if}

							<div
								class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/50 {option.isAvailable
									? 'group-hover:border-amber-500 group-hover:bg-amber-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-amber-500/30 dark:group-hover:border-amber-500/50 dark:group-hover:bg-amber-500/15 dark:group-hover:text-amber-500'
									: ''}"
							>
								<PlatformIcon size={32} stroke={1.5} />
							</div>

							<div class="space-y-1">
								<h3
									class="text-2xl font-black tracking-tight text-slate-900 dark:text-white"
								>
									{option.name}
								</h3>
								<p class="text-sm font-bold text-slate-500 dark:text-slate-400">
									{option.details}
								</p>
							</div>

							<div
								class="mt-4 flex w-full items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800"
							>
								<span
									class="text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500"
									>{option.size}</span
								>
								<span
									class="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
								>
									{option.ext}
								</span>
							</div>
						</a>
					</div>
				{/each}
			</div>
		</div>

		<!-- Footer Info & Utils -->
		<div class="mx-auto max-w-2xl space-y-16">
			<!-- Checksums Toggle (Security Conscious) -->
			{#if data.installer}
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
									<p
										class="font-black tracking-widest text-amber-500/70 uppercase"
									>
										Windows (x64) SHA-256
									</p>
									<p
										class="rounded-xl border border-slate-200 bg-white p-4 break-all text-slate-600 select-all dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400"
									>
										{data.installer.hash}
									</p>
								</div>
								<div class="space-y-2">
									<p
										class="font-black tracking-widest text-blue-500/70 uppercase"
									>
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
			{/if}

			<!-- Home Navigation -->
			<div class="pt-8">
				<Button
					variant="ghost"
					href="/"
					class="group h-12 rounded-lg border border-transparent px-8 text-[10px] font-black tracking-widest text-slate-500 uppercase transition-all hover:border-amber-500/20 hover:bg-amber-500/10 hover:text-amber-500 dark:text-slate-400"
				>
					<MoveLeft
						class="mr-3 h-4 w-4 transition-transform group-hover:-translate-x-2"
					/>
					{m.download_back_home()}
				</Button>
			</div>
		</div>
	</div>
</main>
