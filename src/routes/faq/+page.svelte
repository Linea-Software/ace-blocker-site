<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { canonicalUrl } from '$lib/seo';
	import { jsonLdScript } from '$lib/structured-data';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();

	// A single source for both visible answers and the corresponding JSON-LD.
	const questions = [
		{ question: m.faq_q1(), answer: m.faq_a1() },
		{ question: m.faq_q2(), answer: m.faq_a2() },
		{ question: m.faq_q3(), answer: m.faq_a3() },
		{ question: m.faq_q4(), answer: m.faq_a4() },
		{ question: m.faq_q5(), answer: m.faq_a5() },
		{ question: m.faq_q6(), answer: m.faq_a6() },
		{ question: m.faq_q7(), answer: m.faq_a7() },
		{ question: m.faq_q8(), answer: m.faq_a8() }
	];
</script>

<svelte:head>
	<title>{m.faq_page_title()}</title>
	<meta name="description" content={m.faq_page_description()} />
	<meta property="og:title" content={m.faq_page_title()} />
	<meta property="og:description" content={m.faq_page_description()} />
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.faq_page_title()} />
	<meta name="twitter:description" content={m.faq_page_description()} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON serialization escapes all '<' characters -->
	{@html jsonLdScript({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: questions.map(({ question, answer }) => ({
			'@type': 'Question',
			name: question,
			acceptedAnswer: { '@type': 'Answer', text: answer }
		}))
	})}
</svelte:head>

<Navbar isPro={data.isPro} />

<main id="main-content">
	<section class="border-b border-border py-14 sm:py-20">
		<div class="ace-shell max-w-4xl">
			<p class="font-mono text-xs text-muted-foreground">{m.faq_kicker()}</p>
			<h1 class="mt-5 font-display text-5xl font-semibold tracking-tight sm:text-6xl">
				{m.faq_heading()}
			</h1>
			<p class="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
				{m.faq_intro()}
			</p>
		</div>
	</section>

	<section aria-label={m.faq_heading()} class="py-6 sm:py-10">
		<div class="ace-shell max-w-4xl">
			<ol class="divide-y divide-border">
				{#each questions as item, index (index)}
					<li class="grid gap-4 py-8 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
						<span class="pt-1 font-mono text-sm text-muted-foreground"
							>{String(index + 1).padStart(2, '0')}</span
						>
						<div>
							<h2 class="font-display text-2xl font-semibold">{item.question}</h2>
							<p class="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
								{item.answer}
							</p>
						</div>
					</li>
				{/each}
			</ol>
		</div>
	</section>

	<section class="border-t border-border bg-card py-12 sm:py-16">
		<div
			class="ace-shell flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center"
		>
			<h2 class="font-display text-3xl font-semibold">{m.faq_cta_title()}</h2>
			<a
				href={resolve(localizeHref('/download') as '/download')}
				class="inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
			>
				{m.faq_cta_link()}
			</a>
		</div>
	</section>
</main>

<MarketingFooter />
