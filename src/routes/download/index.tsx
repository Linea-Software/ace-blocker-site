import {
	createEffect,
	createMemo,
	createSignal,
	For,
	Loading,
	onCleanup,
	onSettled,
	Show
} from 'solid-js';
import { query, useLocation } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { Check, Copy, Download, Loader2, Terminal } from '@lucide/solid';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import * as m from '$lib/paraglide/messages.js';
import { canonicalUrl } from '$lib/seo';
import { isPublicDownloadEnabled } from '$lib/public-download-platforms';
import {
	installerArch,
	installerCommand,
	requestedDownloadPlatform
} from './_components/installer-command';
import { IconBrandWindows, IconBrandApple, IconBrandUbuntu } from './_components/PlatformIcons';
import PlatformGrid, { type PlatformOption } from './_components/PlatformGrid';
import ChecksumCard from './_components/ChecksumCard';
import {
	getDownloadPlatforms,
	type DownloadOS,
	type DownloadPlatforms,
	type DownloadPlatformMeta
} from './_components/download-data';
import './download.css';

const publishedDownloads = query(getDownloadPlatforms, 'publishedDownloads');
type PlatformId = DownloadOS;
const platformIds = ['windows', 'macos', 'linux'] as const;

function detectPlatform(): PlatformId | null {
	const ua = navigator.userAgent.toLowerCase(),
		platform = navigator.platform.toLowerCase();
	if (platform.includes('win') || ua.includes('windows')) return 'windows';
	if (platform.includes('mac') || ua.includes('macintosh')) return 'macos';
	if (platform.includes('linux') || ua.includes('linux')) return 'linux';
	return null;
}
function size(meta: DownloadPlatformMeta | null) {
	return meta ? Math.round(meta.size / 1024 / 1024) + '\u00a0MB' : '—';
}
function DownloadContent() {
	const location = useLocation();
	const rows = createMemo<DownloadPlatforms>(() => publishedDownloads());
	const [detected, setDetected] = createSignal<PlatformId | null>(null);
	const [chosen, setChosen] = createSignal<PlatformId | null>(null);
	const [copied, setCopied] = createSignal<PlatformId | null>(null);
	const [loading, setLoading] = createSignal(false);
	const [left, setLeft] = createSignal(false),
		[right, setRight] = createSignal(false);
	let scroller: HTMLPreElement | undefined;
	let loadTimer: number | undefined;
	onSettled(() => {
		setDetected(detectPlatform());
	});
	onCleanup(() => {
		if (loadTimer !== undefined) window.clearTimeout(loadTimer);
	});
	const requested = createMemo<PlatformId | null>(() =>
		requestedDownloadPlatform(location.search)
	);
	const available = createMemo(() =>
		platformIds.filter((p) => isPublicDownloadEnabled(p) && rows()[p] !== null)
	);
	const preferred = createMemo(() => {
		if (requested()) return requested();
		const detectedOS = detected();
		return detectedOS && isPublicDownloadEnabled(detectedOS) && rows()[detectedOS]
			? detectedOS
			: null;
	});
	const effective = createMemo<PlatformId>(
		() =>
			chosen() ??
			preferred() ??
			available()[0] ??
			requested() ??
			(detected() && isPublicDownloadEnabled(detected()!) ? detected()! : null) ??
			'windows'
	);
	const selected = createMemo(() => rows()[effective()]);
	const command = createMemo(() => {
		const meta = selected();
		return meta ? installerCommand(effective(), meta.architecture, meta.fileName) : null;
	});
	function updateScroll() {
		const element = scroller;
		if (!element) {
			setLeft(false);
			setRight(false);
			return;
		}
		const max = Math.max(0, element.scrollWidth - element.clientWidth);
		setLeft(element.scrollLeft > 1);
		setRight(max - element.scrollLeft > 1);
	}
	createEffect(
		() => command(),
		() => {
			if (!scroller) return;
			const observer = new ResizeObserver(updateScroll);
			observer.observe(scroller);
			updateScroll();
			return () => observer.disconnect();
		}
	);
	async function copy() {
		const value = command();
		if (!value) return;
		try {
			await navigator.clipboard.writeText(value);
			setCopied(effective());
		} catch {
			setCopied(null);
		}
	}
	function choose(platform: PlatformId) {
		if (!isPublicDownloadEnabled(platform)) return;
		setChosen(platform);
		setCopied(null);
		setLoading(false);
	}
	function manualDownload() {
		const meta = selected();
		if (!meta) return;
		setLoading(true);
		window.location.href = `/download/${installerArch(effective(), meta.architecture)}`;
		if (loadTimer !== undefined) window.clearTimeout(loadTimer);
		loadTimer = window.setTimeout(() => setLoading(false), 2000);
	}
	const options = createMemo<PlatformOption[]>(() => [
		{
			id: 'windows',
			routeArch: installerArch('windows', rows().windows?.architecture ?? 'x64'),
			name: m.download_platform_windows(),
			icon: IconBrandWindows,
			size: size(rows().windows),
			version: rows().windows?.version,
			ext: rows().windows?.fileName.endsWith('.exe') ? '.exe' : '.msi',
			details: m.download_platform_windows_details(),
			isAvailable: rows().windows !== null
		},
		{
			id: 'macos',
			routeArch: installerArch('macos', rows().macos?.architecture ?? 'x64'),
			name: m.download_platform_macos(),
			icon: IconBrandApple,
			size: size(rows().macos),
			version: rows().macos?.version,
			ext: '.dmg',
			details: m.download_platform_macos_details(),
			isAvailable: rows().macos !== null
		},
		{
			id: 'linux',
			routeArch: installerArch('linux', rows().linux?.architecture ?? 'x64'),
			name: m.download_platform_linux(),
			icon: IconBrandUbuntu,
			size: size(rows().linux),
			version: rows().linux?.version,
			ext: '.tar.gz',
			details: m.download_platform_linux_details(),
			isAvailable: rows().linux !== null
		}
	]);
	const visible = createMemo(() =>
		options().filter((o) => isPublicDownloadEnabled(o.id as PlatformId))
	);
	return (
		<>
			<Navbar isPro={false} />
			<main id="main-content">
				<section class="border-b border-border">
					<div class="ace-shell grid gap-8 py-10 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.28fr)] lg:items-start lg:gap-12 lg:py-14">
						<div class="min-w-0">
							<p class="font-mono text-xs text-muted-foreground">
								{m.download_release_label()}
							</p>
							<h1 class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl">
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
									class={
										visible().length === 2
											? 'grid grid-cols-2 gap-2'
											: 'grid grid-cols-3 gap-2'
									}
									role="group"
									aria-label={m.download_platform_select_label()}
								>
									<For each={visible()}>
										{(option) => {
											const Icon = option.icon;
											return (
												<button
													type="button"
													aria-pressed={
														effective() === option.id ? 'true' : 'false'
													}
													onClick={() => choose(option.id as PlatformId)}
													class={`inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border px-2 text-xs font-semibold transition-colors sm:text-sm ${effective() === option.id ? 'border-foreground bg-foreground text-background' : 'border-border bg-background text-foreground hover:bg-accent'}`}
												>
													<Icon
														size={18}
														stroke={1.6}
														aria-hidden="true"
													/>
													<span class="min-w-0 truncate">
														{option.name}
													</span>
												</button>
											);
										}}
									</For>
								</div>
							</div>
							<div class="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
								<button
									type="button"
									onClick={manualDownload}
									disabled={loading() || !selected()}
									class="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-foreground px-4 font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
								>
									<Show
										when={loading()}
										fallback={<Download class="size-4" aria-hidden="true" />}
									>
										<Loader2 class="size-4 animate-spin" aria-hidden="true" />
									</Show>
									{m.download_manual_button()}
								</button>
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
											onClick={copy}
											disabled={!command()}
											aria-label={m.download_command_copy_for({
												platform:
													effective() === 'windows'
														? m.download_platform_windows()
														: effective() === 'macos'
															? m.download_platform_macos()
															: m.download_platform_linux()
											})}
											class="command-copy absolute top-1 right-1 z-10 inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed"
										>
											<Show
												when={copied() === effective() && command()}
												fallback={
													<>
														<Copy class="size-4" aria-hidden="true" />
														<span class="hidden sm:inline">
															{m.download_command_copy()}
														</span>
													</>
												}
											>
												<Check class="size-4" aria-hidden="true" />
												<span class="hidden sm:inline">
													{m.download_command_copied()}
												</span>
											</Show>
										</button>
										<Show
											when={command()}
											fallback={
												<p class="px-3 py-3 pr-14 text-xs text-muted-foreground sm:pr-32">
													{m.download_not_available()}
												</p>
											}
										>
											<pre
												role="region"
												ref={(el) => {
													scroller = el;
												}}
												onScroll={updateScroll}
												tabindex={0}
												aria-label={m.download_terminal_option_label()}
												class="command-scroll min-w-0 overflow-x-auto py-3 pr-14 pl-3 font-mono text-xs leading-relaxed sm:pr-32"
											>
												<code>{command()}</code>
											</pre>
											<div
												aria-hidden="true"
												class={`command-fade command-fade-left pointer-events-none absolute top-0 bottom-1.5 left-0 z-[1] w-10 rounded-l-md ${left() ? 'visible' : ''}`}
											/>
											<div
												aria-hidden="true"
												class={`command-fade command-fade-right pointer-events-none absolute top-0 right-0 bottom-1.5 z-[1] w-10 rounded-r-md ${right() ? 'visible' : ''}`}
											/>
										</Show>
									</div>
								</div>
							</div>
							<Show when={selected()}>
								{(meta) => (
									<div
										class="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground sm:px-5"
										data-testid="installer-release-metadata"
									>
										<span>v{meta().version}</span>
										<span aria-hidden="true">·</span>
										<span>{size(meta())}</span>
									</div>
								)}
							</Show>
						</div>
					</div>
				</section>
				<section class="border-b border-border bg-card py-12 sm:py-16">
					<div class="ace-shell">
						<PlatformGrid
							platforms={visible()}
							detectedArch={
								selected()
									? installerArch(effective(), selected()!.architecture)
									: null
							}
						/>
					</div>
				</section>
				<Show when={selected()?.hash}>
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
							<ChecksumCard hash={selected()!.hash} />
						</div>
					</section>
				</Show>
			</main>
			<MarketingFooter />
		</>
	);
}
export default function DownloadPage() {
	const location = useLocation();
	return (
		<>
			<Title>{m.page_title_download()}</Title>
			<Meta name="description" content={m.download_description()} />
			<Meta property="og:title" content={m.page_title_download()} />
			<Meta property="og:description" content={m.download_description()} />
			<Meta property="og:url" content={canonicalUrl(location.pathname)} />
			<Meta name="twitter:title" content={m.page_title_download()} />
			<Meta name="twitter:description" content={m.download_description()} />
			<Loading
				fallback={
					<main id="main-content" class="ace-shell min-h-[60vh] py-16" aria-busy="true" />
				}
			>
				<DownloadContent />
			</Loading>
		</>
	);
}
