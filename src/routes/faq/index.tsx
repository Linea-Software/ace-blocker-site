import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import { For } from 'solid-js';
import { Head, Title, Meta } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import { localizeHref } from '$lib/paraglide/runtime';
import { canonicalUrl } from '$lib/seo';
import * as m from '$lib/paraglide/messages';

export default function FAQPage(props: { data?: { isPro?: boolean } }) {
	const location = useLocation();
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
	const jsonLd = JSON.stringify({
		'@context': 'https://schema.org',
		'@type': 'FAQPage',
		mainEntity: questions.map(({ question, answer }) => ({
			'@type': 'Question',
			name: question,
			acceptedAnswer: { '@type': 'Answer', text: answer }
		}))
	}).replace(/</g, '\\u003c');

	return (
		<>
			<Head>
				<Title>{m.faq_page_title()}</Title>
				<Meta name="description" content={m.faq_page_description()} />
				<Meta property="og:title" content={m.faq_page_title()} />
				<Meta property="og:description" content={m.faq_page_description()} />
				<Meta property="og:url" content={canonicalUrl(location.pathname)} />
				<Meta name="twitter:title" content={m.faq_page_title()} />
				<Meta name="twitter:description" content={m.faq_page_description()} />
				<script type="application/ld+json" innerHTML={jsonLd} />
			</Head>
			<Navbar isPro={props.data?.isPro ?? false} />
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
							<For each={questions}>
								{(item, index) => (
									<li class="grid gap-4 py-8 sm:grid-cols-[3.5rem_1fr] sm:gap-6">
										<span class="pt-1 font-mono text-sm text-muted-foreground">
											{String(index() + 1).padStart(2, '0')}
										</span>
										<div>
											<h2 class="font-display text-2xl font-semibold">
												{item.question}
											</h2>
											<p class="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
												{item.answer}
											</p>
										</div>
									</li>
								)}
							</For>
						</ol>
					</div>
				</section>
				<section class="border-t border-border py-8">
					<div class="ace-shell flex max-w-4xl flex-wrap gap-5">
						<a
							class="text-sm font-semibold underline underline-offset-4"
							href={localizeHref('/features/network-blocks')}
						>
							{m.feature_explore_blocks()}
						</a>
						<a
							class="text-sm font-semibold underline underline-offset-4"
							href={localizeHref('/features/resistance')}
						>
							{m.feature_explore_resistance()}
						</a>
					</div>
				</section>
				<section class="border-t border-border bg-card py-12 sm:py-16">
					<div class="ace-shell flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
						<h2 class="font-display text-3xl font-semibold">{m.faq_cta_title()}</h2>
						<a
							href={localizeHref('/download')}
							class="inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
						>
							{m.faq_cta_link()}
						</a>
					</div>
				</section>
			</main>
			<MarketingFooter />
		</>
	);
}
