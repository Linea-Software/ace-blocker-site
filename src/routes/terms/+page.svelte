<script lang="ts">
	import { page } from '$app/state';
	import { canonicalUrl } from '$lib/seo';
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
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.page_title_terms()} />
	<meta name="twitter:description" content={m.page_description_terms()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main id="main-content" class="min-h-[calc(100vh-4rem)] bg-background text-foreground">
	<article class="ace-shell max-w-3xl py-14 sm:py-20">
		<h1 class="mb-2 font-display text-5xl font-semibold tracking-tight">{m.terms_heading()}</h1>
		<p class="mb-12 text-muted-foreground">{m.legal_last_updated()}</p>

		<div class="prose prose-neutral dark:prose-invert max-w-none space-y-8">
			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s1_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s1_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s2_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s2_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s3_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">{m.terms_s3_intro()}</p>
				<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
					<li>{m.terms_s3_credentials()}</li>
					<li>{m.terms_s3_laws()}</li>
					<li>{m.terms_s3_purpose()}</li>
					<li>
						{m.terms_s3_tamper()}
					</li>
				</ul>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s4_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s4_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s5_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s5_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s6_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s6_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s7_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s7_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s8_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s8_body()}
				</p>
			</section>

			<section>
				<h2 class="mb-3 font-display text-2xl font-semibold">{m.terms_s9_title()}</h2>
				<p class="leading-relaxed text-muted-foreground">
					{m.terms_s9_body()}
				</p>
				<p class="mt-2 font-semibold text-foreground">support@aceblocker.com</p>
			</section>
		</div>
	</article>
</main>

<MarketingFooter />
