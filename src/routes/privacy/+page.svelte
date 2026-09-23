<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
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

<main id="main-content" class="min-h-[calc(100vh-4rem)] bg-background text-foreground">
	<article class="ace-shell max-w-3xl py-14 sm:py-20">
		<h1 class="mb-2 font-display text-5xl font-semibold tracking-tight">Privacy Policy</h1>
		<p class="mb-12 text-muted-foreground">Last updated: June 2026</p>

		<div class="space-y-8">
			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">1. Information We Collect</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker is designed with privacy as a core principle. We collect minimal
					information necessary to provide the service:
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
				<h2 class="mb-3 font-display text-2xl font-semibold">2. What We Do Not Collect</h2>
				<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Log your browsing history</li>
					<li>Track individual website visits</li>
					<li>Collect personal browsing patterns</li>
					<li>
						Blocking statistics — they are computed locally on your device and never
						sent to us
					</li>
					<li>Sell your data to third parties</li>
					<li>Use your data for advertising purposes</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">
					3. How We Use Your Information
				</h2>
				<p class="leading-relaxed text-muted-foreground">
					Your information is used exclusively to:
				</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Provide and maintain the Software</li>
					<li>Process your subscription payments (via Dodo Payments)</li>
					<li>Sync your settings across devices (cloud backup)</li>
					<li>Improve the Software through opt-in error and crash reports</li>
					<li>Communicate important service updates</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">
					4. Data Storage and Security
				</h2>
				<p class="leading-relaxed text-muted-foreground">
					Account data is stored on secure servers with encryption at rest and in transit.
					Your block lists, schedules, and settings are stored locally on your device.
					Cloud backups are encrypted before transmission and storage.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">5. Third-Party Services</h2>
				<p class="leading-relaxed text-muted-foreground">
					We use the following third-party services:
				</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>
						<strong>Dodo Payments</strong>: Processes subscription payments. Their
						privacy policy applies to payment data.
					</li>
					<li>
						<strong>BunnyCDN</strong>: Hosts downloadable category data and Resistance
						Mode scripts. No personal data is shared.
					</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">6. Data Retention</h2>
				<p class="leading-relaxed text-muted-foreground">
					Account data is retained for the duration of your account. You may request
					deletion of your account and associated data at any time through the account
					settings page. Deletion is permanent and irreversible.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">7. Your Rights</h2>
				<p class="leading-relaxed text-muted-foreground">
					Depending on your jurisdiction, you may have rights to:
				</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Access your personal data</li>
					<li>Correct inaccurate data</li>
					<li>Delete your data</li>
					<li>Export your data in a portable format</li>
					<li>Object to or restrict processing</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">8. Children's Privacy</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software is not intended for use by individuals under the age of 13. We do
					not knowingly collect data from children.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">9. Changes to This Policy</h2>
				<p class="leading-relaxed text-muted-foreground">
					We will notify you of material changes to this policy via email or through the
					Software. Continued use after changes constitutes acceptance.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">10. Contact</h2>
				<p class="leading-relaxed text-muted-foreground">
					For privacy-related inquiries, contact us at:
				</p>
				<p class="mt-2 font-semibold text-foreground">support@aceblocker.com</p>
			</section>
		</div>
	</article>
</main>

<MarketingFooter />
