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
		IconExternalLink
	} from '@tabler/icons-svelte';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import PlatformGrid from './_components/PlatformGrid.svelte';
	import ChecksumCard from './_components/ChecksumCard.svelte';

	let { data } = $props();

	interface PlatformMeta {
		version: string;
		size: number;
		os: 'windows' | 'macos' | 'linux';
		architecture: string;
		hash: string;
	}

	type PlatformId = 'windows' | 'macos' | 'linux';

	// Map display arch IDs (used in UI) to the route-compatible arch strings
	const ARCH_IDS: Record<PlatformId, string> = {
		windows: 'windows_x64',
		macos: 'macos_universal',
		linux: 'linux_x64'
	};

	// The platform the visitor explicitly requested (?arch=...), when given.
	const REQUESTED_PLATFORM: PlatformId | null = (() => {
		const arch = page.url.searchParams.get('arch');
		if (arch === 'windows_x64' || arch === 'windows_arm64') return 'windows';
		if (arch === 'macos_universal') return 'macos';
		if (arch === 'linux_x64' || arch === 'linux_arm64') return 'linux';
		return null;
	})();

	const platformRows = $derived<Record<PlatformId, PlatformMeta | null>>({
		windows: data.platforms?.windows ?? null,
		macos: data.platforms?.macos ?? null,
		linux: data.platforms?.linux ?? null
	});

	const availablePlatforms = $derived<PlatformId[]>(
		(['windows', 'macos', 'linux'] as PlatformId[]).filter(
			(platform) => platformRows[platform] !== null
		)
	);

	let detectedPlatform = $state<PlatformId | null>(null);
	let downloadStarting = $state(false);
	let isManualLoading = $state(false);

	// The platform that matches this visitor (explicit request first, then
	// OS detection) when it actually has a release. Auto-download only ever
	// targets one of these — never a different-OS installer.
	const preferredPlatform = $derived.by<PlatformId | null>(() => {
		if (REQUESTED_PLATFORM && platformRows[REQUESTED_PLATFORM]) return REQUESTED_PLATFORM;
		if (detectedPlatform && platformRows[detectedPlatform]) return detectedPlatform;
		return null;
	});

	// Manual-download target: the preferred platform, else any platform that
	// has a release (or null when nothing can be downloaded at all).
	const effectivePlatform = $derived.by<PlatformId | null>(() => {
		return preferredPlatform ?? availablePlatforms[0] ?? null;
	});

	function detectPlatform(): PlatformId | null {
		if (typeof window === 'undefined') return null;
		const platform = window.navigator.platform.toLowerCase();
		const ua = window.navigator.userAgent.toLowerCase();

		if (platform.includes('win') || ua.includes('windows')) return 'windows';
		if (platform.includes('mac') || ua.includes('macintosh')) return 'macos';
		if (platform.includes('linux') || ua.includes('linux')) return 'linux';
		return null;
	}

	function rowFor(platform: PlatformId) {
		return platformRows[platform];
	}

	onMount(() => {
		detectedPlatform = detectPlatform();

		// Automatically trigger download on first arrival — only when an
		// installer exists for the visitor's own platform (requested or
		// detected). Never auto-download a different-OS installer.
		const requested =
			REQUESTED_PLATFORM && rowFor(REQUESTED_PLATFORM) ? REQUESTED_PLATFORM : null;
		const detected = detectedPlatform && rowFor(detectedPlatform) ? detectedPlatform : null;
		const autoTarget = requested ?? detected;
		if (!downloadStarting && autoTarget) {
			downloadStarting = true;
			const target = ARCH_IDS[autoTarget];
			setTimeout(() => {
				window.location.href = `/download/${target}`;
			}, 2000);
		}
	});

	// Hero metadata (version, checksum) always belongs to the platform the
	// visitor is about to receive.
	let selectedMeta = $derived<PlatformMeta | null>(
		effectivePlatform ? (platformRows[effectivePlatform] ?? null) : null
	);

	function formatSize(meta: PlatformMeta | null): string {
		return meta ? Math.round(meta.size / 1024 / 1024) + 'MB' : '—';
	}

	let platformOptions = $derived([
		{
			id: 'windows',
			routeArch: ARCH_IDS.windows,
			name: 'Windows',
			icon: IconBrandWindows,
			size: formatSize(platformRows.windows),
			version: platformRows.windows?.version ?? null,
			ext: '.exe',
			details: 'x64 Installer',
			isAvailable: platformRows.windows !== null
		},
		{
			id: 'macos',
			routeArch: ARCH_IDS.macos,
			name: 'macOS',
			icon: IconBrandApple,
			size: formatSize(platformRows.macos),
			version: platformRows.macos?.version ?? null,
			ext: '.dmg',
			details: 'Universal Binary',
			isAvailable: platformRows.macos !== null
		},
		{
			id: 'linux',
			routeArch: ARCH_IDS.linux,
			name: 'Linux',
			icon: IconBrandUbuntu,
			size: formatSize(platformRows.linux),
			version: platformRows.linux?.version ?? null,
			ext: '.deb',
			details: 'Debian / Ubuntu',
			isAvailable: platformRows.linux !== null
		}
	]);

	function handleManualDownload() {
		if (!effectivePlatform) return;
		isManualLoading = true;
		window.location.href = `/download/${ARCH_IDS[effectivePlatform]}`;
		setTimeout(() => {
			isManualLoading = false;
		}, 2000);
	}
</script>

<svelte:head>
	<title>{m.page_title_download()}</title>
	<meta name="description" content={m.download_description()} />
	<meta property="og:title" content={m.page_title_download()} />
	<meta property="og:description" content={m.download_description()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_download()} />
	<meta name="twitter:description" content={m.download_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main
	class="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 pt-16 pb-12 transition-colors duration-500 dark:bg-background"
>
	<!-- Background Aesthetics (Resistance Mode Theme) -->
	<div
		class="pointer-events-none absolute inset-0 -z-10 bg-background transition-colors duration-500 dark:bg-background"
	>
		<div
			class="absolute inset-0 bg-radial-[at_50%_50%] from-background via-background to-brand/5 dark:from-background dark:via-background dark:to-brand/10"
		></div>
		<div
			class="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-200/50 blur-[120px] dark:bg-primary/10"
		></div>

		<!-- Subtle Moving Orbs -->
		<div
			class="absolute -top-24 -left-24 h-96 w-96 animate-pulse rounded-full bg-brand/5 blur-[100px]"
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
				<img
					src="https://cdn.aceblocker.com/icon.png"
					alt="Ace Blocker"
					width="88"
					height="88"
					style="border-radius: 20px;"
					class="shadow-xl"
				/>
			</div>

			<div class="space-y-4">
				<h1
					class="text-4xl font-black tracking-tighter text-slate-900 md:text-7xl dark:text-white"
				>
					{m.download_title().replace('...', '')}
				</h1>

				{#if downloadStarting}
					<p
						class="flex items-center justify-center gap-2 text-sm font-medium text-amber-600 dark:text-brand"
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
					disabled={isManualLoading || !effectivePlatform}
					class="relative h-14 overflow-hidden rounded-lg bg-brand px-10 text-lg font-bold text-black shadow-xl shadow-brand/20 transition-all hover:scale-105 hover:bg-amber-400 active:scale-95 dark:shadow-brand/10"
				>
					{#if isManualLoading}
						<Loader2 class="mr-2 h-5 w-5 animate-spin" />
					{:else}
						<IconDownload class="mr-2 h-5 w-5" />
					{/if}
					{m.download_manual_button()}
				</Button>

				{#if selectedMeta}
					<a
						href="https://github.com/aintDatCap/ace-blocker/releases"
						target="_blank"
						class="group flex items-center gap-1.5 text-sm font-bold text-slate-500 transition-all hover:text-brand dark:text-slate-400"
					>
						<IconFileText
							size={16}
							class="transition-transform group-hover:rotate-12"
						/>
						Version {selectedMeta.version} - Build Notes
						<IconExternalLink
							size={12}
							class="opacity-0 transition-opacity group-hover:opacity-100"
						/>
					</a>
				{/if}
			</div>
		</div>

		<!-- Platform Bento Grid -->
		<PlatformGrid
			platforms={platformOptions}
			detectedArch={effectivePlatform ? ARCH_IDS[effectivePlatform] : null}
		/>

		<!-- SHA-256 Verification -->
		{#if selectedMeta?.hash}
			<ChecksumCard hash={selectedMeta.hash} />
		{/if}

		<!-- Home Navigation -->
		<div class="pt-8">
			<a
				href="/"
				class="text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				← Back to homepage
			</a>
		</div>
	</div>
</main>
