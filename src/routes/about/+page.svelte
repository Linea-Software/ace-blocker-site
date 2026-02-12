<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Shield, Cpu, Layers, Lock, Code2, ArrowRight } from '@lucide/svelte';
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

<main class="flex min-h-[calc(100vh-4rem)] flex-col">
	<!-- Hero Section -->
	<section class="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto max-w-4xl space-y-8 text-center">
				<h1 class="text-4xl font-extrabold tracking-tight md:text-6xl">
					{m.about_hero_title()} <span class="text-primary">{m.about_hero_app()}</span>
				</h1>
				<p class="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
					{m.about_hero_description()}
				</p>
			</div>
		</div>

		<!-- Background Decoration -->
		<div
			class="pointer-events-none absolute top-0 left-1/2 -z-10 h-full w-full -translate-x-1/2 opacity-10"
		>
			<div
				class="absolute top-[20%] left-[-10%] h-[50%] w-[50%] rounded-full bg-primary blur-[150px]"
			></div>
		</div>
	</section>

	<!-- Mission Section -->
	<section class="border-y bg-muted/20 py-20">
		<div class="container mx-auto px-4">
			<div class="grid grid-cols-1 items-center gap-12 md:grid-cols-2">
				<div class="space-y-6">
					<h2 class="text-3xl font-bold tracking-tight md:text-4xl">{m.about_mission_title()}</h2>
					<p class="text-lg leading-relaxed text-muted-foreground">
						{m.about_mission_description()}
					</p>
				</div>
				<div class="relative flex justify-center">
					<div
						class="flex h-64 w-64 animate-pulse items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/20 to-primary/5 backdrop-blur-sm"
					>
						<Shield class="h-32 w-32 text-primary" />
					</div>
					<!-- Decorative Circles -->
					<div class="absolute -top-4 -right-4 h-12 w-12 rounded-full bg-blue-500/20 blur-xl"></div>
					<div
						class="absolute -bottom-4 -left-4 h-16 w-16 rounded-full bg-primary/20 blur-xl"
					></div>
				</div>
			</div>
		</div>
	</section>

	<!-- The Engine Section -->
	<section class="py-24">
		<div class="container mx-auto px-4">
			<div class="mb-16 space-y-4 text-center">
				<div
					class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
				>
					<Cpu class="h-4 w-4" />
					High-Performance Core
				</div>
				<h2 class="text-3xl font-bold tracking-tight md:text-4xl">{m.about_tech_title()}</h2>
				<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
					{m.about_tech_description()}
				</p>
			</div>

			<div class="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2">
				<!-- System-Wide -->
				<div
					class="group rounded-2xl border bg-card p-8 transition-all duration-300 hover:bg-muted/50"
				>
					<div
						class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 transition-transform group-hover:scale-110"
					>
						<Layers class="h-6 w-6 text-blue-500" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.about_feature_system_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.about_feature_system_description()}
					</p>
				</div>

				<!-- Intelligent DB -->
				<div
					class="group rounded-2xl border bg-card p-8 transition-all duration-300 hover:bg-muted/50"
				>
					<div
						class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10 transition-transform group-hover:scale-110"
					>
						<Cpu class="h-6 w-6 text-green-500" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.about_feature_intel_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.about_feature_intel_description()}
					</p>
				</div>

				<!-- Boredom Scripts -->
				<div
					class="group rounded-2xl border bg-card p-8 transition-all duration-300 hover:bg-muted/50"
				>
					<div
						class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110"
					>
						<Code2 class="h-6 w-6 text-primary" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.about_feature_scripts_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.about_feature_scripts_description()}
					</p>
				</div>

				<!-- Locks -->
				<div
					class="group rounded-2xl border bg-card p-8 transition-all duration-300 hover:bg-muted/50"
				>
					<div
						class="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 transition-transform group-hover:scale-110"
					>
						<Lock class="h-6 w-6 text-orange-500" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.about_feature_locks_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.about_feature_locks_description()}
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- CTA Section -->
	<section class="mb-12 py-20">
		<div class="container mx-auto px-4">
			<div
				class="relative space-y-8 overflow-hidden rounded-3xl bg-primary px-8 py-12 text-center text-primary-foreground md:py-20"
			>
				<!-- Decorative pattern -->
				<div class="pointer-events-none absolute inset-0 opacity-10">
					<div
						class="absolute top-0 left-0 h-full w-full"
						style="background-image: radial-gradient(circle at 2px 2px, white 1px, transparent 0); background-size: 40px 40px;"
					></div>
				</div>

				<h2 class="relative z-10 text-3xl font-bold md:text-5xl">Ready to take back control?</h2>
				<p class="relative z-10 mx-auto max-w-2xl text-lg text-primary-foreground/80 md:text-xl">
					Join thousands of users who have transformed their relationship with the internet using
					Ace Blocker.
				</p>
				<div class="relative z-10 flex flex-col justify-center gap-4 sm:flex-row">
					<Button
						size="lg"
						variant="secondary"
						class="h-12 px-8 text-lg font-semibold"
						href={downloadUrl}
					>
						{m.hero_download_button()}
					</Button>
					<Button
						size="lg"
						variant="outline"
						class="h-12 border-primary-foreground/20 bg-transparent px-8 text-lg font-semibold text-primary-foreground hover:bg-primary-foreground/10"
						href="/get-pro"
					>
						{m.hero_pro_button()}
					</Button>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="mt-auto border-t bg-background py-12">
	<div class="container mx-auto px-4">
		<div class="flex flex-col items-center justify-between gap-8 md:flex-row">
			<div class="flex items-center gap-2">
				<Shield class="h-5 w-5 text-primary" />
				<span class="font-bold tracking-tight">{m.hero_title_app()}</span>
			</div>
			<p class="text-sm text-muted-foreground">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
			<div class="flex items-center gap-6">
				<a href="/terms" class="text-sm text-muted-foreground hover:text-foreground"
					>{m.footer_terms()}</a
				>
				<a href="/privacy" class="text-sm text-muted-foreground hover:text-foreground"
					>{m.footer_privacy()}</a
				>
			</div>
		</div>
	</div>
</footer>

<style>
	/* Custom animations or transitions if needed */
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
