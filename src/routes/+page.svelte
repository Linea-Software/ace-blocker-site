<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Zap, Lock, BarChart3, ArrowRight, Download, Info } from '@lucide/svelte';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
	import { getDownloadUrl } from '$lib/utils/platform';
	import { page } from '$app/state';

	let { data } = $props();
	let downloadUrl = $state('/download');
	let isDark = $derived(mode.current === 'dark');

	const showFarewell = $derived(page.url.searchParams.get('deleted') === 'true');

	$effect(() => {
		downloadUrl = getDownloadUrl();
	});
</script>

<Navbar isPro={data.isPro} />

{#if showFarewell}
	<div
		class="flex items-center gap-3 border-b border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300"
	>
		<Info class="h-4 w-4 shrink-0" />
		<p>{m.account_farewell_banner()}</p>
	</div>
{/if}

<main class="flex min-h-[calc(100vh-4rem)] flex-col antialiased">
	<!-- Hero Section -->
	<section
		class="relative overflow-hidden bg-gradient-to-b from-background to-muted pt-20 pb-16 transition-colors duration-500 md:pt-32 md:pb-24 dark:from-slate-950 dark:to-slate-950"
	>
		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto max-w-3xl space-y-8 text-center">
				<a
					href={downloadUrl}
					class="mb-4 inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium backdrop-blur-sm transition-all hover:bg-muted dark:border-slate-800 dark:bg-slate-900/50"
				>
					<span class="mr-2 text-primary dark:text-amber-500">{m.hero_new_badge()}</span>
					<span
						class="text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-slate-200"
					>
						{m.hero_version_available()}
					</span>
					<ArrowRight class="ml-2 h-3 w-3" />
				</a>
				<h1
					class="bg-gradient-to-b from-slate-900 to-slate-600 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl dark:from-white dark:to-white/80"
				>
					{m.hero_title_focus()}
					<span class="text-amber-500 dark:text-amber-400">{m.hero_title_app()}</span>
				</h1>
				<p
					class="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground md:text-2xl dark:text-slate-400"
				>
					{m.hero_description()}
				</p>
				<div class="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
					<Button
						size="lg"
						class="h-12 w-full bg-foreground px-8 text-lg font-semibold text-background shadow-lg shadow-foreground/10 hover:bg-foreground/85 sm:w-auto dark:bg-slate-50 dark:text-slate-950 dark:shadow-amber-500/10 dark:hover:bg-white"
						href={downloadUrl}
					>
						<Download class="mr-2 h-5 w-5" />
						{m.hero_download_button()}
					</Button>
					<Button
						variant="outline"
						size="lg"
						class="h-12 w-full border-2 border-foreground/60 px-8 text-lg font-semibold text-foreground hover:bg-foreground/5 sm:w-auto dark:border-amber-500 dark:text-amber-500 dark:hover:bg-amber-500/10"
						href="/get-pro"
					>
						{m.hero_pro_button()}
					</Button>
				</div>
			</div>
		</div>

		<div
			class="pointer-events-none absolute top-0 left-1/2 -z-10 h-full w-full -translate-x-1/2 opacity-10 dark:opacity-30"
		>
			<div
				class="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary blur-[120px] dark:bg-amber-500/20"
			></div>
			<div
				class="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500 blur-[120px] dark:bg-blue-900/20"
			></div>
		</div>
	</section>

	<!-- Features Section -->
	<section
		class="relative z-10 bg-muted py-24 transition-colors duration-500 dark:bg-slate-900/50"
	>
		<div class="container mx-auto px-4">
			<div class="mb-20 space-y-4 text-center">
				<h2
					class="text-3xl font-bold tracking-tight text-card-foreground md:text-4xl dark:text-white"
				>
					{m.features_section_title()}
				</h2>
				<p class="mx-auto max-w-2xl text-lg text-muted-foreground dark:text-slate-400">
					{m.features_section_description()}
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				<div
					class="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
				>
					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20 dark:bg-amber-500/10 dark:group-hover:bg-amber-500/20"
					>
						<Lock class="h-7 w-7 text-primary dark:text-amber-500" />
					</div>
					<h3 class="mb-4 text-2xl font-bold text-card-foreground dark:text-white">
						{m.feature_blocks_title()}
					</h3>
					<p class="leading-relaxed text-muted-foreground dark:text-slate-400">
						{m.feature_blocks_description()}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
				>
					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/10 transition-colors group-hover:bg-blue-500/20 dark:bg-blue-500/10 dark:group-hover:bg-blue-500/20"
					>
						<Zap class="h-7 w-7 text-blue-500" />
					</div>
					<h3 class="mb-4 text-2xl font-bold text-card-foreground dark:text-white">
						{m.feature_scripts_title()}
					</h3>
					<p class="leading-relaxed text-muted-foreground dark:text-slate-400">
						{m.feature_scripts_description()}
					</p>
				</div>

				<div
					class="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
				>
					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-green-500/10 transition-colors group-hover:bg-green-500/20 dark:bg-green-500/10 dark:group-hover:bg-green-500/20"
					>
						<BarChart3 class="h-7 w-7 text-green-500" />
					</div>
					<h3 class="mb-4 text-2xl font-bold text-card-foreground dark:text-white">
						{m.feature_analytics_title()}
					</h3>
					<p class="leading-relaxed text-muted-foreground dark:text-slate-400">
						{m.feature_analytics_description()}
					</p>
				</div>
			</div>
		</div>
	</section>
</main>

<footer
	class="border-t border-border bg-muted py-16 transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950"
>
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				{#if isDark}
					<img src={darkFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{:else}
					<img src={lightFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{/if}
			</div>
			<p class="text-sm text-muted-foreground dark:text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-8">
				<a
					href="/terms"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white"
					>{m.footer_terms()}</a
				>
				<a
					href="/privacy"
					class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white"
					>{m.footer_privacy()}</a
				>
			</div>
		</div>
	</div>
</footer>
