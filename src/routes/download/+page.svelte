<script lang="ts">
	import { page } from '$app/state';
	import { canonicalUrl } from '$lib/seo';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
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
	import { installerArch } from './_components/installer-command';
	import InstallCommands from './_components/InstallCommands.svelte';
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
	let isManualLoading = $state(false);

	const preferredPlatform = $derived.by<PlatformId | null>(() => {
		if (REQUESTED_PLATFORM && platformRows[REQUESTED_PLATFORM]) return REQUESTED_PLATFORM;
		if (detectedPlatform && platformRows[detectedPlatform]) return detectedPlatform;
		return null;
	});

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

	onMount(() => {
		detectedPlatform = detectPlatform();
	});

	const selectedMeta = $derived<PlatformMeta | null>(
		effectivePlatform ? (platformRows[effectivePlatform] ?? null) : null
	);

	function formatSize(meta: PlatformMeta | null): string {
		return meta ? Math.round(meta.size / 1024 / 1024) + '\u00A0MB' : '—';
	}

	const platformOptions = $derived([
		{
			id: 'windows',
			routeArch: installerArch('windows', platformRows.windows?.architecture ?? 'x64'),
			name: m.download_platform_windows(),
			icon: IconBrandWindows,
			size: formatSize(platformRows.windows),
			version: platformRows.windows?.version ?? null,
			ext: '.exe',
			details: m.download_platform_windows_details(),
			isAvailable: platformRows.windows !== null
		},
		{
			id: 'macos',
			routeArch: installerArch('macos', platformRows.macos?.architecture ?? 'x64'),
			name: m.download_platform_macos(),
			icon: IconBrandApple,
			size: formatSize(platformRows.macos),
			version: platformRows.macos?.version ?? null,
			ext: '.dmg',
			details: m.download_platform_macos_details(),
			isAvailable: platformRows.macos !== null
		},
		{
			id: 'linux',
			routeArch: installerArch('linux', platformRows.linux?.architecture ?? 'x64'),
			name: m.download_platform_linux(),
			icon: IconBrandUbuntu,
			size: formatSize(platformRows.linux),
			version: platformRows.linux?.version ?? null,
			ext: '.deb',
			details: m.download_platform_linux_details(),
			isAvailable: platformRows.linux !== null
		}
	]);

	function handleManualDownload() {
		if (!effectivePlatform) return;
		isManualLoading = true;
		window.location.href = `/download/${installerArch(effectivePlatform, selectedMeta?.architecture ?? 'x64')}`;
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
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.page_title_download()} />
	<meta name="twitter:description" content={m.download_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main id="main-content">
	<section class="border-b border-border">
		<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-end lg:py-20">
			<div>
				<p class="font-mono text-xs text-muted-foreground">{m.download_release_label()}</p>
				<h1
					class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
				>
					{m.download_platform_title()}
				</h1>
				<p class="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
					{m.download_platform_description()}
				</p>
			</div>

			<div class="overflow-hidden rounded-lg border border-border bg-card">
				{#if selectedMeta}
					<div class="grid sm:grid-cols-[1fr_auto] sm:items-stretch">
						<div class="p-5 sm:p-6">
							<div class="flex flex-wrap items-center gap-x-5 gap-y-2">
								<p class="font-display text-2xl font-semibold">
									{effectivePlatform === 'windows'
										? m.download_platform_windows()
										: effectivePlatform === 'macos'
											? m.download_platform_macos()
											: m.download_platform_linux()}
								</p>
								<p class="font-mono text-xs text-muted-foreground">
									v{selectedMeta.version}
								</p>
								<p class="font-mono text-xs text-muted-foreground">
									{formatSize(selectedMeta)}
								</p>
							</div>

							<p class="mt-4 text-sm text-muted-foreground">
								{m.download_description()}
							</p>

							<a
								href="https://github.com/aintDatCap/ace-blocker/releases"
								target="_blank"
								rel="noreferrer"
								class="mt-5 inline-flex items-center gap-2 text-sm font-medium hover:underline"
							>
								<IconFileText size={16} aria-hidden="true" />
								{m.download_release_notes({ version: selectedMeta.version })}
								<IconExternalLink size={13} aria-hidden="true" />
							</a>
						</div>

						<div
							class="border-t border-border p-5 sm:flex sm:items-center sm:border-t-0 sm:border-l sm:p-6"
						>
							<button
								type="button"
								onclick={handleManualDownload}
								disabled={isManualLoading || !effectivePlatform}
								class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 sm:w-auto"
							>
								{#if isManualLoading}
									<Loader2 class="size-4 animate-spin" aria-hidden="true" />
								{:else}
									<IconDownload size={18} aria-hidden="true" />
								{/if}
								{m.download_manual_button()}
							</button>
						</div>
					</div>
				{:else}
					<div class="p-6 text-sm text-muted-foreground">
						{m.download_not_available()}
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-card py-12 sm:py-16">
		<div class="ace-shell">
			<PlatformGrid
				platforms={platformOptions}
				detectedArch={effectivePlatform
					? installerArch(effectivePlatform, selectedMeta?.architecture ?? 'x64')
					: null}
			/>
		</div>
	</section>

	<InstallCommands
		platforms={[
			{ id: 'windows', architecture: platformRows.windows?.architecture ?? null },
			{ id: 'macos', architecture: platformRows.macos?.architecture ?? null },
			{ id: 'linux', architecture: platformRows.linux?.architecture ?? null }
		] satisfies { id: PlatformId; architecture: string | null }[]}
	/>

	{#if selectedMeta?.hash}
		<section class="py-12 sm:py-16">
			<div class="ace-shell grid gap-7 lg:grid-cols-[0.6fr_1.4fr] lg:items-start">
				<div>
					<h2 class="font-display text-3xl font-semibold">
						{m.download_integrity_title()}
					</h2>
					<p class="mt-3 max-w-md leading-relaxed text-muted-foreground">
						{m.download_integrity_description()}
					</p>
				</div>
				<ChecksumCard hash={selectedMeta.hash} />
			</div>
		</section>
	{/if}
</main>

<MarketingFooter />
