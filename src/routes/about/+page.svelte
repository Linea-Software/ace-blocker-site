<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Cpu, Layers, Lock, Sparkles } from '@lucide/svelte';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import icon from '$lib/assets/logo/SVG/icon.svg';
	import { mode } from 'mode-watcher';
	import { page } from '$app/state';
	import * as m from '$lib/paraglide/messages';
	import { getDownloadUrl } from '$lib/utils/platform';

	let { data } = $props();
	let downloadUrl = $state('/download');
	let isDark = $derived(mode.current === 'dark');

	$effect(() => {
		downloadUrl = getDownloadUrl();
	});
</script>

<svelte:head>
	<title>{m.about_hero_app()} — About</title>
	<meta name="description" content={m.about_hero_description()} />
	<meta property="og:title" content="{m.about_hero_app()} — About" />
	<meta property="og:description" content={m.about_hero_description()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content="{m.about_hero_app()} — About" />
	<meta name="twitter:description" content={m.about_hero_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main
	class="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground transition-colors duration-500 dark:bg-[#0B0B0F] dark:text-slate-50"
>
	<!-- Hero Section -->
	<section class="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-24">
		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto max-w-4xl space-y-8 text-center">
				<h1
					class="text-4xl font-black tracking-tight text-foreground sm:text-5xl md:text-6xl dark:text-slate-50"
				>
					{m.about_hero_title()}
					<span
						class="block bg-gradient-to-r from-amber-400 to-[#FFBF00] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,191,0,0.4)]"
					>
						{m.about_hero_app()}
					</span>
				</h1>
				<p
					class="mx-auto max-w-3xl text-lg leading-relaxed text-slate-700 md:text-xl dark:text-slate-400"
				>
					{m.about_hero_description()}
				</p>
			</div>
		</div>

		<!-- Background Decoration -->
		<div
			class="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-40"
		>
			<div
				class="absolute h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[150px]"
			></div>
			<div
				class="absolute h-[400px] w-[400px] translate-x-32 translate-y-32 rounded-full bg-blue-600/10 blur-[120px]"
			></div>
		</div>
	</section>

	<!-- Mission Section -->
	<section
		class="relative overflow-hidden border-y border-border bg-muted py-20 dark:border-slate-900 dark:bg-slate-950/50"
	>
		<!-- Subtle radial backdrop -->
		<div
			class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent"
		></div>

		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto grid max-w-5xl grid-cols-1 items-center gap-16 md:grid-cols-2">
				<div class="space-y-6">
					<h2
						class="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white"
					>
						{m.about_mission_title()}
					</h2>
					<p class="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
						{m.about_mission_description()}
					</p>
				</div>
				<div class="group relative flex justify-center">
					<div
						class="relative flex h-64 w-64 items-center justify-center rounded-[3rem] border border-border bg-card p-6 shadow-md backdrop-blur-md transition-all duration-500 group-hover:border-amber-500/50 group-hover:shadow-[0_0_40px_rgba(255,191,0,0.1)] dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-2xl"
					>
						<div class="relative flex items-center justify-center">
							<img
								src={icon}
								alt="Ace Blocker"
								class="h-auto w-[70%] transition-transform duration-700 group-hover:scale-110"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- The Engine Section (Bento Grid) -->
	<section class="relative overflow-hidden py-24">
		<div
			class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent"
		></div>

		<div class="relative z-10 container mx-auto px-4">
			<div class="mb-16 space-y-4 text-center">
				<h2
					class="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white"
				>
					{m.about_tech_title()}
				</h2>
				<p class="mx-auto max-w-2xl text-lg text-slate-600 dark:text-slate-400">
					{m.about_tech_description()}
				</p>
			</div>

			<div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
				<!-- System-Wide -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Layers class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">
						{m.about_feature_system_title()}
					</h3>
					<p class="leading-relaxed text-slate-600 dark:text-slate-400">
						{m.about_feature_system_description()}
					</p>
				</div>

				<!-- Intelligent DB -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Cpu class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">
						{m.about_feature_intel_title()}
					</h3>
					<p class="leading-relaxed text-slate-600 dark:text-slate-400">
						{m.about_feature_intel_description()}
					</p>
				</div>

				<!-- Hardened Locks -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Lock class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">
						{m.about_feature_locks_title()}
					</h3>
					<p class="leading-relaxed text-slate-600 dark:text-slate-400">
						{m.about_feature_locks_description()}
					</p>
				</div>
			</div>

			<!-- Break the Habit Loop (full-width) -->
			<div class="mx-auto mt-6 max-w-5xl">
				<div
					class="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/50 dark:shadow-xl dark:hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Sparkles class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-900 dark:text-slate-100">
						{m.about_feature_scripts_title()}
					</h3>
					<p class="leading-relaxed text-slate-600 dark:text-slate-400">
						{m.about_feature_scripts_description()}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="relative mb-24 py-12">
		<div class="container mx-auto px-4">
			<div
				class="relative space-y-8 overflow-hidden rounded-[3rem] border border-border bg-muted px-8 py-16 text-center shadow-2xl backdrop-blur-md md:py-24 dark:border-slate-800 dark:bg-slate-950/80"
			>
				<!-- Decorative pattern & Glows -->
				<div class="absolute inset-0 z-0">
					<div
						class="absolute top-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 opacity-50 blur-[100px] dark:opacity-100"
					></div>
					<div
						class="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
						style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 32px 32px;"
					></div>
				</div>

				<div class="relative z-10 mx-auto max-w-3xl space-y-6">
					<h2
						class="text-3xl font-black tracking-tight text-slate-900 md:text-5xl dark:text-white"
					>
						{m.about_cta_title()}
					</h2>
					<p class="text-lg text-slate-700 md:text-xl dark:text-slate-400">
						{m.about_cta_description()}
					</p>
				</div>

				<div
					class="relative z-10 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
				>
					<Button
						class="h-14 w-full bg-gradient-to-r from-[#FFBF00] to-orange-500 px-10 text-lg font-black text-white shadow-[0_10px_30px_rgba(255,191,0,0.3)] transition-all hover:scale-[1.02] active:scale-95 sm:w-auto"
						href={downloadUrl}
					>
						{m.hero_download_button()}
					</Button>
					<Button
						variant="outline"
						class="h-14 w-full border-slate-300 bg-transparent px-10 text-lg font-bold text-slate-900 transition-colors hover:bg-amber-500/10 hover:text-amber-600 sm:w-auto dark:border-[#FFBF00]/50 dark:text-[#FFBF00] dark:hover:text-[#FFBF00]"
						href="/get-pro"
					>
						{m.hero_pro_button()}
					</Button>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="border-t border-border bg-muted py-16 dark:border-slate-900 dark:bg-[#0B0B0F]">
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				{#if isDark}
					<img src={darkFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{:else}
					<img src={lightFullLogo} alt="Ace Blocker" class="h-8 w-auto" />
				{/if}
			</div>
			<p class="text-sm text-muted-foreground">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div
				class="flex items-center gap-8 text-sm font-bold text-slate-600 dark:text-slate-400"
			>
				<a
					href="/terms"
					class="transition-colors hover:text-amber-600 dark:hover:text-[#FFBF00]"
					>{m.footer_terms()}</a
				>
				<a
					href="/privacy"
					class="transition-colors hover:text-amber-600 dark:hover:text-[#FFBF00]"
					>{m.footer_privacy()}</a
				>
			</div>
		</div>
	</div>
</footer>

<style>
	:global(html) {
		scroll-behavior: smooth;
		background-color: white;
	}

	:global(html.dark) {
		background-color: #0b0b0f;
	}

	:global(body) {
		background-color: white;
		color: #0f172a;
	}

	:global(.dark body) {
		background-color: #0b0b0f;
		color: #f8fafc;
	}
</style>
