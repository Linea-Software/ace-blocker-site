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
		IconDownload
	} from '@tabler/icons-svelte';
	import { Check, Copy, Terminal, Loader2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { installerArch, installerCommand } from './_components/installer-command';
	import { isPublicDownloadEnabled } from '$lib/public-download-platforms';
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
		if (arch === 'macos_universal' && isPublicDownloadEnabled('macos')) return 'macos';
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
			(platform) => isPublicDownloadEnabled(platform) && platformRows[platform] !== null
		)
	);

	let detectedPlatform = $state<PlatformId | null>(null);
	let chosenPlatform = $state<PlatformId | null>(null);
	let copiedPlatform = $state<PlatformId | null>(null);
	let isManualLoading = $state(false);
	let commandScroller = $state<HTMLPreElement | null>(null);
	let hasCommandToLeft = $state(false);
	let hasCommandToRight = $state(false);

	function updateCommandScrollHints() {
		const element = commandScroller;
		if (!element) {
			hasCommandToLeft = false;
			hasCommandToRight = false;
			return;
		}
		const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
		hasCommandToLeft = element.scrollLeft > 1;
		hasCommandToRight = maxScroll - element.scrollLeft > 1;
	}

	const preferredPlatform = $derived.by<PlatformId | null>(() => {
		if (REQUESTED_PLATFORM) return REQUESTED_PLATFORM;
		if (
			detectedPlatform &&
			isPublicDownloadEnabled(detectedPlatform) &&
			platformRows[detectedPlatform]
		)
			return detectedPlatform;
		return null;
	});

	const effectivePlatform = $derived<PlatformId>(
		chosenPlatform ??
			preferredPlatform ??
			availablePlatforms[0] ??
			REQUESTED_PLATFORM ??
			(detectedPlatform && isPublicDownloadEnabled(detectedPlatform)
				? detectedPlatform
				: null) ??
			'windows'
	);

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

	const selectedMeta = $derived<PlatformMeta | null>(platformRows[effectivePlatform] ?? null);
	const selectedCommand = $derived(
		selectedMeta ? installerCommand(effectivePlatform, selectedMeta.architecture) : null
	);

	$effect(() => {
		// Recheck after a platform change and whenever the command area resizes.
		const command = selectedCommand;
		const element = commandScroller;
		if (!element || !command) {
			hasCommandToLeft = false;
			hasCommandToRight = false;
			return;
		}
		const resizeObserver = new ResizeObserver(updateCommandScrollHints);
		resizeObserver.observe(element);
		updateCommandScrollHints();
		return () => resizeObserver.disconnect();
	});

	async function copySelectedCommand() {
		if (!selectedCommand) return;
		try {
			await navigator.clipboard.writeText(selectedCommand);
			copiedPlatform = effectivePlatform;
		} catch {
			copiedPlatform = null;
		}
	}

	function choosePlatform(platform: PlatformId) {
		if (!isPublicDownloadEnabled(platform)) return;
		chosenPlatform = platform;
		copiedPlatform = null;
		isManualLoading = false;
	}

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
			ext: '.msi',
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
			ext: '.tar.gz',
			details: m.download_platform_linux_details(),
			isAvailable: platformRows.linux !== null
		}
	]);

	const visiblePlatformOptions = $derived(
		platformOptions.filter((option) => isPublicDownloadEnabled(option.id as PlatformId))
	);

	function handleManualDownload() {
		if (!selectedMeta) return;
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
		<div
			class="ace-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-12 lg:py-14"
		>
			<div class="min-w-0">
				<p class="font-mono text-xs text-muted-foreground">{m.download_release_label()}</p>
				<h1
					class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
				>
					{m.download_platform_title()}
				</h1>
				<p class="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
					{m.download_platform_description()}
				</p>
			</div>

			<div
				class="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
				data-testid="primary-installer-card"
			>
				<div class="border-b border-border px-4 py-4 sm:px-5">
					<p class="mb-3 text-xs font-semibold text-muted-foreground">
						{m.download_platform_select_label()}
					</p>
					<div
						class={visiblePlatformOptions.length === 2
							? 'grid grid-cols-2 gap-2'
							: 'grid grid-cols-3 gap-2'}
						role="group"
						aria-label={m.download_platform_select_label()}
					>
						{#each visiblePlatformOptions as option (option.id)}
							{@const PlatformIcon = option.icon}
							<button
								type="button"
								aria-pressed={effectivePlatform === option.id}
								onclick={() => choosePlatform(option.id as PlatformId)}
								class={[
									'inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold transition-colors sm:text-sm',
									effectivePlatform === option.id
										? 'border-foreground bg-foreground text-background'
										: 'border-border bg-background text-foreground hover:bg-accent'
								]}
							>
								<PlatformIcon size={18} stroke={1.6} aria-hidden="true" />
								<span class="min-w-0 truncate">{option.name}</span>
							</button>
						{/each}
					</div>
				</div>

				<div class="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
					<div class="flex min-w-0 flex-col gap-2">
						<button
							type="button"
							onclick={handleManualDownload}
							disabled={isManualLoading || !selectedMeta}
							class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
						>
							{#if isManualLoading}
								<Loader2 class="size-4 animate-spin" aria-hidden="true" />
							{:else}
								<IconDownload size={18} aria-hidden="true" />
							{/if}
							{m.download_manual_button()}
						</button>
					</div>

					<div class="min-w-0 border-t border-border pt-4">
						<p class="mb-2 inline-flex items-center gap-2 text-sm font-semibold">
							<Terminal class="size-4" aria-hidden="true" />
							{m.download_terminal_option_label()}
						</p>
						<div
							class="command-box relative min-w-0 rounded-md border border-border bg-background"
							data-testid="installer-command-box"
						>
							<button
								type="button"
								onclick={copySelectedCommand}
								disabled={!selectedCommand}
								aria-label={m.download_command_copy_for({
									platform:
										effectivePlatform === 'windows'
											? m.download_platform_windows()
											: effectivePlatform === 'macos'
												? m.download_platform_macos()
												: m.download_platform_linux()
								})}
								class="command-copy absolute top-1 right-1 z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
							>
								{#if copiedPlatform === effectivePlatform && selectedCommand}
									<Check class="size-4" aria-hidden="true" />
									<span class="hidden sm:inline"
										>{m.download_command_copied()}</span
									>
								{:else}
									<Copy class="size-4" aria-hidden="true" />
									<span class="hidden sm:inline">{m.download_command_copy()}</span
									>
								{/if}
							</button>
							{#if selectedCommand}
								<!-- svelte-ignore a11y_no_noninteractive_tabindex -- the scroll viewport must be keyboard-focusable -->
								<pre
									role="region"
									bind:this={commandScroller}
									onscroll={updateCommandScrollHints}
									tabindex="0"
									aria-label={m.download_terminal_option_label()}
									class="command-scroll min-w-0 overflow-x-auto py-3 pr-14 pl-3 font-mono text-xs leading-relaxed sm:pr-32"><code
										>{selectedCommand}</code
									></pre>
								<div
									aria-hidden="true"
									class="command-fade command-fade-left pointer-events-none absolute top-0 bottom-1.5 left-0 z-[1] w-10 rounded-l-md"
									class:visible={hasCommandToLeft}
								></div>
								<div
									aria-hidden="true"
									class="command-fade command-fade-right pointer-events-none absolute top-0 right-0 bottom-1.5 z-[1] w-10 rounded-r-md"
									class:visible={hasCommandToRight}
								></div>
							{:else}
								<p class="px-3 py-3 pr-14 text-xs text-muted-foreground sm:pr-32">
									{m.download_not_available()}
								</p>
							{/if}
						</div>
					</div>
				</div>

				{#if selectedMeta}
					<div
						class="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5"
						data-testid="installer-release-metadata"
					>
						<span>v{selectedMeta.version}</span>
						<span aria-hidden="true">·</span>
						<span>{formatSize(selectedMeta)}</span>
					</div>
				{/if}
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-card py-12 sm:py-16">
		<div class="ace-shell">
			<PlatformGrid
				platforms={visiblePlatformOptions}
				detectedArch={effectivePlatform
					? installerArch(effectivePlatform, selectedMeta?.architecture ?? 'x64')
					: null}
			/>
		</div>
	</section>

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

<style>
	.command-scroll {
		/* Keep one thin scrollbar gutter so hover never changes the box height. */
		scrollbar-width: thin;
		scrollbar-color: var(--muted-foreground) transparent;
	}

	.command-scroll::-webkit-scrollbar {
		height: 5px;
	}

	.command-scroll::-webkit-scrollbar-track {
		background: transparent;
	}

	.command-scroll::-webkit-scrollbar-thumb {
		border-radius: 999px;
		background: var(--muted-foreground);
	}

	.command-fade {
		opacity: 0;
		transition: opacity 150ms ease;
	}

	.command-fade.visible {
		opacity: 1;
	}

	.command-fade-left {
		background: linear-gradient(to right, var(--background), transparent);
	}

	.command-fade-right {
		background: linear-gradient(to left, var(--background), transparent);
	}

	@media (hover: hover) and (pointer: fine) {
		.command-scroll {
			scrollbar-color: transparent transparent;
		}

		.command-scroll::-webkit-scrollbar-thumb {
			background: transparent;
		}

		.command-box:is(:hover, :focus-within) .command-scroll {
			scrollbar-color: var(--muted-foreground) transparent;
		}

		.command-box:is(:hover, :focus-within) .command-scroll::-webkit-scrollbar-thumb {
			background: var(--muted-foreground);
		}
	}

	.command-copy {
		transition: opacity 150ms ease;
	}

	/* Touch users have no hover state, so keep the copy action discoverable. */
	.command-copy:disabled {
		opacity: 0.4;
	}

	@media (hover: hover) and (pointer: fine) {
		.command-box .command-copy,
		.command-box .command-copy:disabled {
			opacity: 0;
			pointer-events: none;
		}

		.command-box:is(:hover, :focus-within) .command-copy {
			opacity: 1;
			pointer-events: auto;
		}

		.command-box:is(:hover, :focus-within) .command-copy:disabled {
			opacity: 0.4;
			pointer-events: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.command-copy,
		.command-fade {
			transition: none;
		}
	}
</style>
