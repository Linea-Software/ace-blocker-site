<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Shield, Zap, Lock, BarChart3, ArrowRight, Download } from '@lucide/svelte';
</script>

<Navbar />

<main class="flex flex-col min-h-[calc(100vh-4rem)]">
	<!-- Hero Section -->
	<section class="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
		<div class="container mx-auto px-4 relative z-10">
			<div class="max-w-3xl mx-auto text-center space-y-8">
				<div
					class="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium bg-muted/50 backdrop-blur-sm mb-4"
				>
					<span class="text-primary mr-2">New</span>
					<span class="text-muted-foreground transition-colors hover:text-foreground">
						Version 2.0 is now available
					</span>
					<ArrowRight class="ml-2 h-3 w-3" />
				</div>
				<h1
					class="text-5xl md:text-7xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/70"
				>
					Reclaim Your Focus with <span class="text-primary">Ace Blocker</span>
				</h1>
				<p class="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
					The most powerful blocker designed to help you overcome internet addictions through
					intelligent site filtering and behavior-shaping scripts.
				</p>
				<div class="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
					<Button size="lg" class="h-12 px-8 text-lg font-semibold w-full sm:w-auto" href="/download">
						<Download class="mr-2 h-5 w-5" />
						Download Free
					</Button>
					<Button
						variant="outline"
						size="lg"
						class="h-12 px-8 text-lg font-semibold w-full sm:w-auto"
						href="/get-pro"
					>
						Explore Pro Features
					</Button>
				</div>
			</div>
		</div>

		<!-- Subtle Background Decoration -->
		<div
			class="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 pointer-events-none opacity-20 dark:opacity-10"
		>
			<div
				class="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary blur-[120px]"
			></div>
			<div
				class="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500 blur-[120px]"
			></div>
		</div>
	</section>

	<!-- Features Section -->
	<section class="py-20 bg-muted/30">
		<div class="container mx-auto px-4">
			<div class="text-center mb-16 space-y-4">
				<h2 class="text-3xl md:text-4xl font-bold tracking-tight">Built for Professionals</h2>
				<p class="text-muted-foreground text-lg max-w-2xl mx-auto">
					Simple to setup, impossible to ignore. Ace Blocker provides the tools you need to stay on
					track.
				</p>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6">
						<Lock class="h-6 w-6 text-primary" />
					</div>
					<h3 class="text-xl font-bold mb-3">Hardened Blocks</h3>
					<p class="text-muted-foreground leading-relaxed">
						Advanced network-level blocking that's difficult to bypass, ensuring you stay away from
						distractions when you need to most.
					</p>
				</div>

				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-6">
						<Zap class="h-6 w-6 text-blue-500" />
					</div>
					<h3 class="text-xl font-bold mb-3">Boredom Scripts</h3>
					<p class="text-muted-foreground leading-relaxed">
						Inject scripts that make addictive sites less visually appealing, breaking the dopamine
						loops that keep you scrolling.
					</p>
				</div>

				<div class="rounded-xl border bg-card p-8 shadow-sm transition-all hover:shadow-md">
					<div class="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-6">
						<BarChart3 class="h-6 w-6 text-green-500" />
					</div>
					<h3 class="text-xl font-bold mb-3">Insights & Analytics</h3>
					<p class="text-muted-foreground leading-relaxed">
						Visualize your progress and see exactly how much time you've reclaimed since starting
						your journey with Ace Blocker.
					</p>
				</div>
			</div>
		</div>
	</section>
</main>

<footer class="border-t py-12 bg-background">
	<div class="container mx-auto px-4">
		<div class="flex flex-col md:flex-row justify-between items-center gap-8">
			<div class="flex items-center gap-2">
				<Shield class="h-5 w-5 text-primary" />
				<span class="font-bold tracking-tight">Ace Blocker</span>
			</div>
			<p class="text-sm text-muted-foreground">
				&copy; {new Date().getFullYear()} Ace Blocker. All rights reserved.
			</p>
			<div class="flex items-center gap-6">
				<a href="/terms" class="text-sm text-muted-foreground hover:text-foreground">Terms</a>
				<a href="/privacy" class="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
			</div>
		</div>
	</div>
</footer>
