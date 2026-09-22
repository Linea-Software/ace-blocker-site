<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/components/Navbar.svelte';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
	let isDark = $derived(mode.current === 'dark');
</script>

<svelte:head>
	<title>{m.page_title_privacy()}</title>
	<meta name="description" content={m.page_description_privacy()} />
	<meta property="og:title" content={m.page_title_privacy()} />
	<meta property="og:description" content={m.page_description_privacy()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_privacy()} />
	<meta name="twitter:description" content={m.page_description_privacy()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main class="flex min-h-[calc(100vh-4rem)] flex-col bg-background text-foreground transition-colors duration-500 dark:bg-background dark:text-slate-50">
	<article class="container mx-auto max-w-3xl px-4 py-16 md:py-24">
		<h1 class="mb-2 text-4xl font-extrabold tracking-tight md:text-5xl">Privacy Policy</h1>
		<p class="mb-12 text-muted-foreground">Last updated: June 2026</p>

		<div class="space-y-8">
			<section>
				<h2 class="mb-3 text-2xl font-bold">1. Information We Collect</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker is designed with privacy as a core principle. We collect minimal information necessary to provide the service:
				</p>
				<div class="mt-4 space-y-3">
					<div>
						<h3 class="font-semibold">Account Information</h3>
						<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
							<li>Email address (for account creation and communication)</li>
							<li>Account preferences and settings</li>
						</ul>
					</div>
					<div>
						<h3 class="font-semibold">Usage Data (Pro Users Only)</h3>
						<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
							<li>Resistance mode interaction metrics</li>
							<li>Backup data (stored encrypted)</li>
						</ul>
					</div>
					<div>
						<h3 class="font-semibold">Technical Data</h3>
						<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
							<li>Software version and platform information</li>
							<li>Error and crash reports (opt-in)</li>
						</ul>
					</div>
				</div>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">2. What We Do Not Collect</h2>
				<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Log your browsing history</li>
					<li>Track individual website visits</li>
					<li>Collect personal browsing patterns</li>
					<li>Blocking statistics — they are computed locally on your device and never sent to us</li>
					<li>Sell your data to third parties</li>
					<li>Use your data for advertising purposes</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">3. How We Use Your Information</h2>
				<p class="leading-relaxed text-muted-foreground">Your information is used exclusively to:</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Provide and maintain the Software</li>
					<li>Process your subscription payments (via Dodo Payments)</li>
					<li>Sync your settings across devices (cloud backup)</li>
					<li>Improve the Software through opt-in error and crash reports</li>
					<li>Communicate important service updates</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">4. Data Storage and Security</h2>
				<p class="leading-relaxed text-muted-foreground">
					Account data is stored on secure servers with encryption at rest and in transit. Your block lists, schedules, and settings are stored locally on your device. Cloud backups are encrypted before transmission and storage.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">5. Third-Party Services</h2>
				<p class="leading-relaxed text-muted-foreground">We use the following third-party services:</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li><strong>Dodo Payments</strong>: Processes subscription payments. Their privacy policy applies to payment data.</li>
					<li><strong>BunnyCDN</strong>: Hosts downloadable category data and Resistance Mode scripts. No personal data is shared.</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">6. Data Retention</h2>
				<p class="leading-relaxed text-muted-foreground">
					Account data is retained for the duration of your account. You may request deletion of your account and associated data at any time through the account settings page. Deletion is permanent and irreversible.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">7. Your Rights</h2>
				<p class="leading-relaxed text-muted-foreground">Depending on your jurisdiction, you may have rights to:</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Access your personal data</li>
					<li>Correct inaccurate data</li>
					<li>Delete your data</li>
					<li>Export your data in a portable format</li>
					<li>Object to or restrict processing</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">8. Children's Privacy</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software is not intended for use by individuals under the age of 13. We do not knowingly collect data from children.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">9. Changes to This Policy</h2>
				<p class="leading-relaxed text-muted-foreground">
					We will notify you of material changes to this policy via email or through the Software. Continued use after changes constitutes acceptance.
				</p>
			</section>

			<section>
				<h2 class="mb-3 text-2xl font-bold">10. Contact</h2>
				<p class="leading-relaxed text-muted-foreground">
					For privacy-related inquiries, contact us at:
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
				<a href={resolve('/terms')} class="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-slate-400 dark:hover:text-white">Terms</a>
				<a href={resolve('/privacy')} class="text-sm font-medium text-foreground transition-colors">Privacy</a>
			</div>
		</div>
	</div>
</footer>
