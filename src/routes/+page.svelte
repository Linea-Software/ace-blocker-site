<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Shield, Zap, Lock, BarChart3, ArrowRight, Download } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { getDownloadUrl } from '$lib/utils/platform';

	let downloadUrl = $state('/download');

	$effect(() => {
		downloadUrl = getDownloadUrl();
	});
</script>

<Navbar />

<main class="flex min-h-[calc(100vh-4rem)] flex-col">
	<!-- Hero Section -->
	<section class="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
		<div class="relative z-10 container mx-auto px-4">
			<div class="mx-auto max-w-3xl space-y-8 text-center">
				<a
					href={downloadUrl}
					class="mb-4 inline-flex items-center rounded-full border bg-muted/50 px-3 py-1 text-sm font-medium backdrop-blur-sm transition-all hover:bg-muted"
				>
					<span class="mr-2 text-primary">{m.hero_new_badge()}</span>
					<span class="text-muted-foreground transition-colors hover:text-foreground">
						{m.hero_version_available()}
					</span>
					<ArrowRight class="ml-2 h-3 w-3" />
				</a>
				<h1
					class="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent md:text-7xl"
				>
					{m.hero_title_focus()} <span class="text-primary">{m.hero_title_app()}</span>
				</h1>
				<p class="mx-auto max-w-2xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
					{m.hero_description()}
				</p>
				<div class="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
					<Button
						size="lg"
						class="h-12 w-full px-8 text-lg font-semibold sm:w-auto"
						href={downloadUrl}
					>
						<Download class="mr-2 h-5 w-5" />
						{m.hero_download_button()}
					</Button>
					<Button
						variant="outline"
						size="lg"
						class="h-12 w-full px-8 text-lg font-semibold sm:w-auto"
						href="/get-pro"
					>
						{m.hero_pro_button()}
					</Button>
				</div>
			</div>
		</div>

		<!-- Subtle Background Decoration -->
		<div
			class="pointer-events-none absolute top-0 left-1/2 -z-10 h-full w-full -translate-x-1/2 opacity-20 dark:opacity-10"
		>
			<div
				class="absolute top-[-10%] left-[-10%] h-[40%] w-[40%] rounded-full bg-primary blur-[120px]"
			></div>
			<div
				class="absolute right-[-10%] bottom-[-10%] h-[40%] w-[40%] rounded-full bg-blue-500 blur-[120px]"
			></div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="bg-muted/30 py-20">
		<div class="container mx-auto px-4">
			<div class="mb-16 space-y-4 text-center">
				<h2 class="text-3xl font-bold tracking-tight md:text-4xl">{m.features_section_title()}</h2>
				<p class="mx-auto max-w-2xl text-lg text-muted-foreground">
					{m.features_section_description()}
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
						<Lock class="h-6 w-6 text-primary" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.feature_blocks_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.feature_blocks_description()}
					</p>
				</div>

				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
						<Zap class="h-6 w-6 text-blue-500" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.feature_scripts_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.feature_scripts_description()}
					</p>
				</div>

				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
						<BarChart3 class="h-6 w-6 text-green-500" />
					</div>
					<h3 class="mb-3 text-xl font-bold">{m.feature_analytics_title()}</h3>
					<p class="leading-relaxed text-muted-foreground">
						{m.feature_analytics_description()}
					</p>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="border-t bg-background py-12">
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
