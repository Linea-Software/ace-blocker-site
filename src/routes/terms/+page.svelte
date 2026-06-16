<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';

	let { data } = $props();
	let isDark = $derived(mode.current === 'dark');
</script>

<svelte:head>
	<title>Terms of Service — Ace Blocker</title>
</svelte:head>

<Navbar isPro={data.isPro} />

<main class="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground transition-colors duration-500 dark:bg-[#0B0B0F] dark:text-slate-50">
	<article class="container mx-auto max-w-3xl px-4 py-16 md:py-24">
		<h1 class="mb-2 text-4xl font-extrabold tracking-tight md:text-5xl">Terms of Service</h1>
		<p class="mb-12 text-muted-foreground">Last updated: June 2026</p>

		<div class="prose prose-neutral max-w-none dark:prose-invert space-y-8">
			<section>
				<h2 class="mb-3 text-2xl font-bold">1. Acceptance of Terms</h2>
				<p class="leading-relaxed text-muted-foreground">
					By downloading, installing, or using Ace Blocker ("the Software"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Software.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">2. Description of Service</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker is a network and program blocking application designed to help users manage internet usage habits. The Software provides network-level filtering, resistance mode scripts, and related tools to reduce exposure to addictive online content.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">3. User Responsibilities</h2>
				<p class="leading-relaxed text-muted-foreground">You are responsible for:</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Maintaining the confidentiality of your account credentials</li>
					<li>Ensuring your use of the Software complies with all applicable laws</li>
					<li>Using the Software in a manner consistent with its intended purpose</li>
					<li>Not attempting to bypass, reverse engineer, or tamper with the Software's protection mechanisms</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">4. Pro Subscription</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker offers a Pro subscription with additional features. Subscriptions are billed according to the plan selected at purchase. You may cancel your subscription at any time; cancellation takes effect at the end of the current billing period. Refunds are handled in accordance with applicable consumer protection laws.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">5. Intellectual Property</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software, including its code, design, documentation, site lists, and resistance scripts, is the intellectual property of Linea Software. You are granted a limited, non-exclusive, non-transferable license to use the Software for personal use.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">6. Limitation of Liability</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software is provided "as is" without warranty of any kind. Linea Software is not liable for any damages arising from the use or inability to use the Software, including but not limited to data loss, service interruption, or any indirect or consequential damages.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">7. Termination</h2>
				<p class="leading-relaxed text-muted-foreground">
					We reserve the right to suspend or terminate your access to the Software at our discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users or the Software.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">8. Changes to Terms</h2>
				<p class="leading-relaxed text-muted-foreground">
					We may update these Terms from time to time. Continued use of the Software after changes constitutes acceptance of the new Terms.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">9. Contact</h2>
				<p class="leading-relaxed text-muted-foreground">
					For questions about these Terms, contact us at:
				</p>
				<p class="mt-2 font-semibold text-foreground">
					support@aceblocker.com
				</p>
			</section>
		</div>
	</article>
</main>

<footer class="border-t border-border bg-muted py-16 transition-colors duration-500 dark:border-slate-800 dark:bg-slate-950">
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
				&copy; {new Date().getFullYear()} Ace Blocker. All rights reserved.
			</p>
			<div class="flex items-center gap-8">
				<a href="/terms" class="text-sm font-medium text-foreground transition-colors">Terms</a>
				<a href="/privacy" class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white">Privacy</a>
			</div>
		</div>
	</div>
</footer>
