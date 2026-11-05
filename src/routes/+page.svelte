<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import PolicyVisual from '$lib/components/marketing/PolicyVisual.svelte';
	import ResistanceScale from '$lib/components/marketing/ResistanceScale.svelte';
	import ScheduleTimeline from '$lib/components/marketing/ScheduleTimeline.svelte';
	import SitePackVisual from '$lib/components/marketing/SitePackVisual.svelte';
	import { Download, Info } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { canonicalUrl } from '$lib/seo';
	import { jsonLdScript, softwareData } from '$lib/structured-data';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';

	let { data } = $props();
	const showFarewell = $derived(page.url.searchParams.get('deleted') === 'true');
</script>

<svelte:head>
	<title>{m.page_title_home()}</title>
	<meta name="description" content={m.home_seo_description()} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- JSON serialization escapes all '<' characters -->
	{@html jsonLdScript(softwareData(m.home_seo_description()))}
	<meta property="og:title" content={m.page_title_home()} />
	<meta property="og:description" content={m.home_description()} />
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.page_title_home()} />
	<meta name="twitter:description" content={m.home_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />

{#if showFarewell}
	<div class="border-b border-information/30 bg-information/10">
		<div class="ace-shell flex items-start gap-3 py-3 text-sm">
			<Info class="mt-0.5 size-4 shrink-0 text-information" aria-hidden="true" />
			<p>{m.account_farewell_banner()}</p>
		</div>
	</div>
{/if}

<main id="main-content">
	<section class="border-b border-border">
		<div class="ace-shell grid gap-12 py-14 lg:grid-cols-[1fr_1fr] lg:items-center lg:py-20">
			<div class="max-w-xl">
				<h1
					class="font-display text-[clamp(2.75rem,6.2vw,4.75rem)] leading-[0.94] font-semibold tracking-[-0.045em] text-balance"
				>
					{m.home_title()}
				</h1>
				<p class="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground sm:text-xl">
					{m.home_description()}
				</p>

				<div class="mt-8 flex flex-col gap-3 sm:flex-row">
					<a
						href={resolve(localizeHref('/download') as '/download')}
						class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
					>
						<Download class="size-4" aria-hidden="true" />
						{m.marketing_download_button()}
					</a>
					<a
						href={resolve(localizeHref('/get-pro') as '/get-pro')}
						class="inline-flex min-h-12 items-center justify-center rounded-md border border-foreground/30 px-5 font-medium hover:bg-accent"
					>
						{m.marketing_pro_button()}
					</a>
				</div>

				{#if data.newRelease}
					<a
						href={resolve(localizeHref('/download') as '/download')}
						class="mt-7 inline-flex items-center gap-3 border-l-2 border-signal pl-3 text-sm hover:underline"
					>
						<span class="font-mono text-xs text-muted-foreground"
							>{m.home_release_badge()}</span
						>
						<span
							>{m.home_release_version_available({
								version: data.newRelease.version
							})}</span
						>
					</a>
				{/if}
			</div>

			<div>
				<div class="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
					<span class="h-px w-6 bg-signal" aria-hidden="true"></span>
					<span>{m.home_mechanism_caption()}</span>
				</div>
				<PolicyVisual />
			</div>
		</div>
	</section>

	<section class="border-b border-border py-12 sm:py-16" aria-labelledby="home-what-is">
		<div class="ace-shell grid gap-6 md:grid-cols-[0.42fr_1fr] md:gap-12">
			<h2 id="home-what-is" class="font-display text-3xl font-semibold">
				{m.home_what_is_title()}
			</h2>
			<div class="max-w-3xl space-y-4 leading-relaxed">
				<p>{m.home_what_is_description()}</p>
				<p class="text-muted-foreground">{m.home_what_is_detail()}</p>
				<a
					href={resolve(localizeHref('/faq') as '/faq')}
					class="inline-block text-sm font-semibold underline underline-offset-4"
					>{m.nav_faq()}</a
				>
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-card">
		<ol class="ace-shell grid list-none md:grid-cols-3">
			<li class="border-b border-border py-8 md:border-r md:border-b-0 md:pr-8">
				<h2 class="font-display text-2xl font-semibold">{m.home_decide_title()}</h2>
				<p class="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
					{m.home_decide_description()}
				</p>
			</li>
			<li class="border-b border-border py-8 md:border-r md:border-b-0 md:px-8">
				<h2 class="font-display text-2xl font-semibold">{m.home_enforce_title()}</h2>
				<p class="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
					{m.home_enforce_description()}
				</p>
			</li>
			<li class="py-8 md:pl-8">
				<h2 class="font-display text-2xl font-semibold">{m.home_hold_title()}</h2>
				<p class="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
					{m.home_hold_description()}
				</p>
			</li>
		</ol>
	</section>

	<section class="border-b border-border py-16 sm:py-20">
		<div class="ace-shell">
			<div class="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
				<div class="max-w-md">
					<h2
						class="font-display text-4xl leading-[0.95] font-semibold tracking-tight sm:text-5xl"
					>
						{m.home_resistance_title()}
					</h2>
					<p class="mt-5 leading-relaxed text-muted-foreground">
						{m.home_resistance_description()}
					</p>
				</div>
				<ResistanceScale />
			</div>
		</div>
	</section>

	<section class="border-b border-border bg-card py-16 sm:py-20">
		<div class="ace-shell grid gap-14 lg:grid-cols-2">
			<div>
				<div class="mb-7 max-w-md">
					<h2 class="font-display text-3xl font-semibold sm:text-4xl">
						{m.home_schedule_title()}
					</h2>
					<p class="mt-4 leading-relaxed text-muted-foreground">
						{m.home_schedule_description()}
					</p>
				</div>
				<ScheduleTimeline />
			</div>
			<div>
				<div class="mb-7 max-w-md">
					<h2 class="font-display text-3xl font-semibold sm:text-4xl">
						{m.home_packs_title()}
					</h2>
					<p class="mt-4 leading-relaxed text-muted-foreground">
						{m.home_packs_description()}
					</p>
				</div>
				<SitePackVisual />
			</div>
		</div>
	</section>

	<section class="border-b border-border">
		<div class="ace-shell grid gap-8 py-12 md:grid-cols-[0.45fr_1fr] md:items-start">
			<h2 class="font-display text-2xl font-semibold">{m.home_privacy_title()}</h2>
			<p class="max-w-2xl text-base leading-relaxed text-muted-foreground">
				{m.home_privacy_note()}
			</p>
		</div>
	</section>

	<section class="py-12 sm:py-16">
		<div class="ace-shell">
			<div
				class="grid overflow-hidden rounded-lg border border-foreground/20 bg-card sm:grid-cols-[6px_1fr_auto] sm:items-center"
			>
				<div class="h-2 bg-signal sm:h-full" aria-hidden="true"></div>
				<div class="px-5 py-7 sm:px-8">
					<h2 class="font-display text-3xl font-semibold">{m.home_closing_title()}</h2>
					<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
						{m.home_closing_description()}
					</p>
				</div>
				<div class="border-t border-border p-5 sm:border-t-0 sm:border-l sm:p-7">
					<a
						href={resolve(localizeHref('/download') as '/download')}
						class="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90 sm:w-auto"
					>
						{m.marketing_download_button()}
					</a>
				</div>
			</div>
		</div>
	</section>
</main>

<MarketingFooter />
