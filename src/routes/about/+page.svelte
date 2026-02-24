<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Shield,
		Timer,
		Cpu,
		Layers,
		Lock,
		Code2,
		ArrowRight,
		Sparkles,
		Globe
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { getDownloadUrl } from '$lib/utils/platform';

	let downloadUrl = $state('/download');

	$effect(() => {
		downloadUrl = getDownloadUrl();
	});
</script>

<svelte:head>
	<title>{m.about_hero_app()} | About</title>
	<meta name="description" content={m.about_hero_description()} />
</svelte:head>

<Navbar />

<main class="flex min-h-[calc(100vh-4rem)] flex-col bg-[#0B0B0F] text-slate-50">
	<!-- Hero Section -->
	<section class="relative overflow-hidden pt-16 pb-16 md:pt-24 md:pb-24">
		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto max-w-4xl space-y-8 text-center">
				<h1 class="text-4xl font-black tracking-tight text-slate-50 sm:text-5xl md:text-6xl">
					{m.about_hero_title()}
					<span
						class="block bg-gradient-to-r from-amber-400 to-[#FFBF00] bg-clip-text text-transparent drop-shadow-[0_0_25px_rgba(255,191,0,0.4)]"
					>
						{m.about_hero_app()}
					</span>
				</h1>
				<p class="mx-auto max-w-3xl text-lg leading-relaxed text-slate-400 md:text-xl">
					{m.about_hero_description()}
				</p>
			</div>
		</div>

		<!-- Background Decoration -->
		<div
			class="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-40"
		>
			<div class="absolute h-[600px] w-[600px] rounded-full bg-amber-500/10 blur-[150px]"></div>
			<div
				class="absolute h-[400px] w-[400px] translate-x-32 translate-y-32 rounded-full bg-blue-600/10 blur-[120px]"
			></div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="relative overflow-hidden border-y border-slate-900 bg-slate-950/50 py-20">
		<!-- Subtle radial backdrop -->
		<div
			class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_left,_var(--tw-gradient-stops))] from-amber-500/5 via-transparent to-transparent"
		></div>

		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto grid max-w-5xl grid-cols-1 items-center gap-16 md:grid-cols-2">
				<div class="space-y-6">
					<h2 class="text-3xl font-black tracking-tight text-white md:text-4xl">
						{m.about_mission_title()}
					</h2>
					<p class="text-lg leading-relaxed text-slate-400">
						{m.about_mission_description()}
					</p>
				</div>
				<div class="group relative flex justify-center">
					<div
						class="relative flex h-64 w-64 items-center justify-center rounded-[3rem] border border-slate-800 bg-slate-900/50 shadow-2xl backdrop-blur-md transition-all duration-500 group-hover:border-amber-500/50 group-hover:shadow-[0_0_40px_rgba(255,191,0,0.1)]"
					>
						<!-- Official Logo Equivalent (Shield + Timer) -->
						<div class="relative flex items-center justify-center">
							<Shield
								class="absolute h-40 w-40 text-amber-500 opacity-20 transition-transform duration-700 group-hover:scale-110"
							/>
							<Timer class="relative z-10 h-24 w-24 text-[#FFBF00]" />
						</div>
					</div>
					<!-- Decorative Glow Circles -->
					<div
						class="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl"
					></div>
					<div
						class="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-[#FFBF00]/10 blur-3xl"
					></div>
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
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold tracking-wider text-amber-500 uppercase"
				>
					<Cpu class="h-4 w-4" />
					High-Performance Core
				</div>
				<h2 class="text-3xl font-black tracking-tight text-white md:text-4xl">
					{m.about_tech_title()}
				</h2>
				<p class="mx-auto max-w-2xl text-lg text-slate-400">
					{m.about_tech_description()}
				</p>
			</div>

			<div class="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2">
				<!-- System-Wide -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Layers class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-100">{m.about_feature_system_title()}</h3>
					<p class="leading-relaxed text-slate-400">
						{m.about_feature_system_description()}
					</p>
				</div>

				<!-- Intelligent DB -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Cpu class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-100">{m.about_feature_intel_title()}</h3>
					<p class="leading-relaxed text-slate-400">
						{m.about_feature_intel_description()}
					</p>
				</div>

				<!-- Boredom Scripts -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Code2 class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-100">{m.about_feature_scripts_title()}</h3>
					<p class="leading-relaxed text-slate-400">
						{m.about_feature_scripts_description()}
					</p>
				</div>

				<!-- Locks -->
				<div
					class="group relative overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-[#FFBF00]/50 hover:shadow-[0_10px_30px_rgba(255,191,0,0.05)]"
				>
					<div
						class="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl transition-all duration-500 group-hover:bg-amber-500/20"
					></div>

					<div
						class="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 transition-transform duration-300 group-hover:scale-110"
					>
						<Lock class="h-7 w-7 text-[#FFBF00]" />
					</div>
					<h3 class="mb-3 text-xl font-bold text-slate-100">{m.about_feature_locks_title()}</h3>
					<p class="leading-relaxed text-slate-400">
						{m.about_feature_locks_description()}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="relative mb-24 py-12">
		<div class="container mx-auto px-4">
			<div
				class="relative space-y-8 overflow-hidden rounded-[3rem] border border-slate-800 bg-slate-950/80 px-8 py-16 text-center shadow-2xl backdrop-blur-md md:py-24"
			>
				<!-- Decorative pattern & Glows -->
				<div class="absolute inset-0 z-0">
					<div
						class="absolute top-0 left-1/2 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-[100px]"
					></div>
					<div
						class="absolute inset-0 opacity-[0.03]"
						style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 32px 32px;"
					></div>
				</div>

				<div class="relative z-10 mx-auto max-w-3xl space-y-6">
					<h2 class="text-3xl font-black tracking-tight text-white md:text-5xl">
						Ready to take back control?
					</h2>
					<p class="text-lg text-slate-400 md:text-xl">
						Join thousands of users who have transformed their relationship with the internet using
						Ace Blocker.
					</p>
				</div>

				<div
					class="relative z-10 mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
				>
					<Button
						class="h-14 w-full bg-gradient-to-r from-[#FFBF00] to-orange-500 px-10 text-lg font-black text-[#0B0B0F] shadow-[0_10px_30px_rgba(255,191,0,0.3)] transition-all hover:scale-[1.02] active:scale-95 sm:w-auto"
						href={downloadUrl}
					>
						{m.hero_download_button()}
					</Button>
					<Button
						variant="outline"
						class="h-14 w-full border-[#FFBF00]/50 bg-transparent px-10 text-lg font-bold text-[#FFBF00] transition-colors hover:bg-[#FFBF00]/10 hover:text-[#FFBF00] sm:w-auto"
						href="/get-pro"
					>
						{m.hero_pro_button()}
					</Button>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="border-t border-slate-900 bg-[#0B0B0F] py-16">
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-3">
				<Shield class="h-7 w-7 text-amber-500" />
				<span class="text-xl font-black tracking-tight text-white">{m.hero_title_app()}</span>
			</div>
			<p class="text-sm text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-8 text-sm font-bold text-slate-400">
				<a href="/terms" class="transition-colors hover:text-[#FFBF00]">{m.footer_terms()}</a>
				<a href="/privacy" class="transition-colors hover:text-[#FFBF00]">{m.footer_privacy()}</a>
			</div>
		</div>
	</div>
</footer>

<style>
	:global(html) {
		scroll-behavior: smooth;
		background-color: #0b0b0f;
	}

	:global(body) {
		background-color: #0b0b0f;
		color: #f8fafc;
	}
</style>
