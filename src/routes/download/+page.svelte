<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Download, Monitor, Laptop, ArrowRight } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let arch = $derived(page.url.searchParams.get('arch') || 'windows_x64');
	let downloadStarted = $state(false);
	let dots = $state('');

	$effect(() => {
		const interval = setInterval(() => {
			dots = dots.length >= 3 ? '' : dots + '.';
		}, 500);
		return () => clearInterval(interval);
	});

	$effect(() => {
		if (!downloadStarted && typeof window !== 'undefined') {
			downloadStarted = true;
			// Small delay to let the page load and show the message
			setTimeout(() => {
				window.location.href = `/download/${arch}`;
			}, 1500);
		}
	});

	const downloadOptions = [
		{ id: 'windows_x64', name: m.download_arch_windows(), icon: Monitor },
		{ id: 'linux_x64', name: m.download_arch_linux(), icon: Laptop }
	];
</script>

<Navbar />

<main class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
	<div class="w-full max-w-2xl space-y-12 text-center">
		<!-- Download Status -->
		<div class="space-y-6">
			<div class="flex justify-center">
				<div class="relative">
					<div
						class="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 transition-transform hover:scale-110"
					>
						<Download class="h-10 w-10 text-primary" />
					</div>
				</div>
			</div>

			<div class="space-y-2">
				<h1 class="text-4xl font-extrabold tracking-tight md:text-5xl">
					{m.download_title().replace('...', '')}<span class="inline-block w-[1.25em] text-left"
						>{dots}</span
					>
				</h1>
				<p class="text-xl text-muted-foreground">
					{m.download_description()}
				</p>
			</div>

			<div class="flex justify-center pt-4">
				<Button size="lg" href={`/download/${arch}`} class="h-12 px-8 text-lg font-semibold">
					<Download class="mr-2 h-5 w-5" />
					{m.download_manual_button()}
				</Button>
			</div>
		</div>

		<!-- Divider -->
		<div class="relative">
			<div class="absolute inset-0 flex items-center" aria-hidden="true">
				<div class="w-full border-t"></div>
			</div>
			<div class="relative flex justify-center text-sm uppercase">
				<span class="bg-background px-4 text-muted-foreground">{m.download_other_arch_title()}</span
				>
			</div>
		</div>

		<!-- Other Architectures -->
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
			{#each downloadOptions as option}
				<Button
					variant={arch === option.id ? 'default' : 'outline'}
					href={`/download/${option.id}`}
					class="flex h-24 flex-col items-center justify-center gap-2 p-4 text-center transition-all hover:scale-[1.02]"
				>
					<svelte:component this={option.icon} class="h-6 w-6" />
					<span class="font-semibold">{option.name}</span>
				</Button>
			{/each}
		</div>

		<!-- Back to Home -->
		<div class="pt-8">
			<a
				href="/"
				class="inline-flex items-center text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowRight class="mr-2 h-4 w-4 rotate-180" />
				Back to homepage
			</a>
		</div>
	</div>

	<!-- Background Aesthetics -->
	<div class="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
		<div
			class="absolute -top-[10%] -left-[10%] h-[40%] w-[40%] rounded-full bg-primary/5 blur-[120px]"
		></div>
		<div
			class="absolute -right-[10%] -bottom-[10%] h-[40%] w-[40%] rounded-full bg-blue-500/5 blur-[120px]"
		></div>
	</div>
</main>
