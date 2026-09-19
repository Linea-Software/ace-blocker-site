<script lang="ts">
	import { page } from '$app/state';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import * as m from '$lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.page_title_terms()}</title>
	<meta name="description" content={m.page_description_terms()} />
	<meta property="og:title" content={m.page_title_terms()} />
	<meta property="og:description" content={m.page_description_terms()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_terms()} />
	<meta name="twitter:description" content={m.page_description_terms()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main id="main-content" class="min-h-[calc(100vh-4rem)] bg-background text-foreground">
	<article class="ace-shell max-w-3xl py-14 sm:py-20">
		<h1 class="mb-2 font-display text-5xl font-semibold tracking-tight">Terms of Service</h1>
		<p class="mb-12 text-muted-foreground">Last updated: June 2026</p>

		<div class="prose prose-neutral dark:prose-invert max-w-none space-y-8">
			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">1. Acceptance of Terms</h2>
				<p class="leading-relaxed text-muted-foreground">
					By downloading, installing, or using Ace Blocker ("the Software"), you agree to
					be bound by these Terms of Service. If you do not agree to these terms, do not
					use the Software.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">2. Description of Service</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker is a network and program blocking application designed to help users
					manage internet usage habits. The Software provides network-level filtering,
					resistance mode scripts, and related tools to reduce exposure to addictive
					online content.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">3. User Responsibilities</h2>
				<p class="leading-relaxed text-muted-foreground">You are responsible for:</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>Maintaining the confidentiality of your account credentials</li>
					<li>Ensuring your use of the Software complies with all applicable laws</li>
					<li>Using the Software in a manner consistent with its intended purpose</li>
					<li>
						Not attempting to bypass, reverse engineer, or tamper with the Software's
						protection mechanisms
					</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">4. Pro Subscription</h2>
				<p class="leading-relaxed text-muted-foreground">
					Ace Blocker offers a Pro subscription with additional features. Subscriptions
					are billed according to the plan selected at purchase. You may cancel your
					subscription at any time; cancellation takes effect at the end of the current
					billing period. Refunds are handled in accordance with applicable consumer
					protection laws.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">5. Intellectual Property</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software, including its code, design, documentation, site lists, and
					resistance scripts, is the intellectual property of Linea Software. You are
					granted a limited, non-exclusive, non-transferable license to use the Software
					for personal use.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">6. Limitation of Liability</h2>
				<p class="leading-relaxed text-muted-foreground">
					The Software is provided "as is" without warranty of any kind. Linea Software is
					not liable for any damages arising from the use or inability to use the
					Software, including but not limited to data loss, service interruption, or any
					indirect or consequential damages.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">7. Termination</h2>
				<p class="leading-relaxed text-muted-foreground">
					We reserve the right to suspend or terminate your access to the Software at our
					discretion, without prior notice, for conduct that we believe violates these
					Terms or is harmful to other users or the Software.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">8. Changes to Terms</h2>
				<p class="leading-relaxed text-muted-foreground">
					We may update these Terms from time to time. Continued use of the Software after
					changes constitutes acceptance of the new Terms.
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">9. Contact</h2>
				<p class="leading-relaxed text-muted-foreground">
					For questions about these Terms, contact us at:
				</p>
				<p class="mt-2 font-semibold text-foreground">support@aceblocker.com</p>
			</section>
		</div>
	</article>
</main>

<MarketingFooter />
