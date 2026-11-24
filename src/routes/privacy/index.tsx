import { canonicalUrl } from '$lib/seo';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import * as m from '$lib/paraglide/messages.js';
import { Head, Meta, Title } from '@solidjs/meta';
import { useLocation } from '@solidjs/router';

export default function Page(props: { data?: { isPro?: boolean } }) {
	const location = useLocation();
	return (
		<>
			<Head>
				<Title>{m.page_title_privacy()}</Title>
				<Meta name="description" content={m.page_description_privacy()} />
				<Meta property="og:title" content={m.page_title_privacy()} />
				<Meta property="og:description" content={m.page_description_privacy()} />
				<Meta property="og:url" content={canonicalUrl(location.pathname)} />
				<Meta name="twitter:title" content={m.page_title_privacy()} />
				<Meta name="twitter:description" content={m.page_description_privacy()} />
			</Head>

			<Navbar isPro={props.data?.isPro ?? false} />

			<main id="main-content" class="min-h-[calc(100vh-4rem)] bg-background text-foreground">
				<article class="ace-shell max-w-3xl py-14 sm:py-20">
					<h1 class="mb-2 font-display text-5xl font-semibold tracking-tight">
						{m.privacy_heading()}
					</h1>
					<p class="mb-12 text-muted-foreground">{m.privacy_last_updated()}</p>

					<div class="space-y-8">
						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s1_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s1_intro()}
							</p>
							<div class="mt-4 space-y-3">
								<div>
									<h3 class="font-semibold">{m.privacy_account_title()}</h3>
									<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
										<li>{m.privacy_account_email()}</li>
										<li>{m.privacy_account_preferences()}</li>
									</ul>
								</div>
								<div>
									<h3 class="font-semibold">{m.privacy_usage_title()}</h3>
									<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
										<li>{m.privacy_usage_metrics()}</li>
										<li>{m.privacy_usage_backup()}</li>
									</ul>
								</div>
								<div>
									<h3 class="font-semibold">{m.privacy_technical_title()}</h3>
									<ul class="mt-1 list-disc space-y-1 pl-6 text-muted-foreground">
										<li>{m.privacy_technical_version()}</li>
										<li>{m.privacy_technical_errors()}</li>
									</ul>
								</div>
							</div>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s2_title()}
							</h2>
							<ul class="list-disc space-y-1 pl-6 text-muted-foreground">
								<li>{m.privacy_s2_history()}</li>
								<li>{m.privacy_s2_visits()}</li>
								<li>{m.privacy_s2_patterns()}</li>
								<li>{m.privacy_s2_stats()}</li>
								<li>{m.privacy_s2_sale()}</li>
								<li>{m.privacy_s2_ads()}</li>
							</ul>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s3_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s3_intro()}
							</p>
							<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
								<li>{m.privacy_s3_software()}</li>
								<li>{m.privacy_s3_payments()}</li>
								<li>{m.privacy_s3_sync()}</li>
								<li>{m.privacy_s3_errors()}</li>
								<li>{m.privacy_s3_updates()}</li>
							</ul>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s4_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s4_body()}
							</p>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s5_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s5_intro()}
							</p>
							<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
								<li>
									<strong>Dodo Payments</strong>: {m.privacy_s5_dodo()}
								</li>
								<li>
									<strong>BunnyCDN</strong>: {m.privacy_s5_bunny()}
								</li>
							</ul>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s6_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s6_body()}
							</p>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s7_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s7_intro()}
							</p>
							<ul class="mt-2 list-disc space-y-1 pl-6 text-muted-foreground">
								<li>{m.privacy_s7_access()}</li>
								<li>{m.privacy_s7_correct()}</li>
								<li>{m.privacy_s7_delete()}</li>
								<li>{m.privacy_s7_export()}</li>
								<li>{m.privacy_s7_object()}</li>
							</ul>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s8_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s8_body()}
							</p>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s9_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s9_body()}
							</p>
						</section>

						<section>
							<h2 class="mb-3 font-display text-2xl font-semibold">
								{m.privacy_s10_title()}
							</h2>
							<p class="leading-relaxed text-muted-foreground">
								{m.privacy_s10_body()}
							</p>
							<p class="mt-2 font-semibold text-foreground">support@aceblocker.com</p>
						</section>
					</div>
				</article>
			</main>

			<MarketingFooter />
		</>
	);
}
