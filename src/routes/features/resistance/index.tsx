import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import ResistanceDemo from '$lib/components/marketing/ResistanceDemo';
import * as m from '$lib/paraglide/messages';
import { canonicalUrl } from '$lib/seo';
import { localizeHref } from '$lib/paraglide/runtime';
import { Head, Meta, Title } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';
import { For } from 'solid-js';

export default function Page(props: { data?: { isPro?: boolean } }) {
	const location = useLocation();
	const explanations = [
		{ title: m.demo_feeds, body: m.demo_feeds_help },
		{ title: m.demo_videos, body: m.demo_videos_help },
		{ title: m.demo_visual, body: m.demo_visual_help },
		{ title: m.demo_delays, body: m.demo_delays_help },
		{ title: m.demo_captcha, body: m.demo_captcha_help }
	];
	return (
		<>
			<Head>
				<Title>{m.feature_resistance_title()} — Ace Blocker</Title>
				<Meta name="description" content={m.feature_resistance_description()} />
				<Meta property="og:title" content={m.feature_resistance_title()} />
				<Meta property="og:description" content={m.feature_resistance_description()} />
				<Meta property="og:url" content={canonicalUrl(location.pathname)} />
				<Meta name="twitter:title" content={m.feature_resistance_title()} />
				<Meta name="twitter:description" content={m.feature_resistance_description()} />
			</Head>

			<Navbar isPro={props.data?.isPro ?? false} />
			<main id="main-content">
				<section class="border-b border-border">
					<div class="ace-shell py-14 sm:py-20">
						<p class="font-mono text-xs text-muted-foreground">
							{m.policy_resistance_label()} · {m.plan_pro_name()}
						</p>
						<h1 class="mt-4 max-w-3xl font-display text-5xl leading-[.95] font-semibold tracking-tight sm:text-6xl">
							{m.feature_resistance_title()}
						</h1>
						<p class="mt-6 max-w-3xl text-lg leading-relaxed text-muted-foreground">
							{m.feature_resistance_description()}
						</p>
						<p class="mt-4 max-w-3xl text-sm leading-relaxed">
							{m.feature_resistance_instructions()}
						</p>
						<div class="mt-9">
							<ResistanceDemo />
						</div>
					</div>
				</section>
				<section class="border-b border-border bg-card py-14 sm:py-20">
					<div class="ace-shell">
						<h2 class="font-display text-3xl font-semibold sm:text-4xl">
							{m.feature_resistance_categories()}
						</h2>
						<dl class="mt-9 grid gap-x-10 md:grid-cols-2">
							<For each={explanations}>
								{(item) => (
									<div class="border-t border-border py-6">
										<dt class="font-display text-2xl font-semibold">
											{item.title()}
										</dt>
										<dd class="mt-3 max-w-xl leading-relaxed text-muted-foreground">
											{item.body()}
										</dd>
									</div>
								)}
							</For>
						</dl>
						<p class="mt-5 max-w-3xl border-l-4 border-signal pl-4 text-sm leading-relaxed">
							{m.feature_resistance_captcha_notice()}
						</p>
					</div>
				</section>
				<section class="py-12">
					<div class="ace-shell flex flex-wrap items-center justify-between gap-5">
						<p class="max-w-lg font-display text-2xl font-semibold">
							{m.feature_resistance_pro_notice()}
						</p>
						<div class="flex flex-wrap gap-3">
							<a
								class="min-h-11 rounded border border-border px-4 py-3 text-sm font-semibold hover:bg-accent"
								href={localizeHref('/features/network-blocks')}
							>
								{m.feature_explore_blocks()}
							</a>
							<a
								class="min-h-11 rounded bg-foreground px-4 py-3 text-sm font-semibold text-background hover:opacity-90"
								href={localizeHref('/get-pro')}
							>
								{m.marketing_pro_button()}
							</a>
						</div>
					</div>
				</section>
			</main>
			<MarketingFooter />
		</>
	);
}
