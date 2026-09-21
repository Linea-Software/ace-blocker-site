<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import PolicyVisual from '$lib/components/marketing/PolicyVisual.svelte';
	import ResistanceScale from '$lib/components/marketing/ResistanceScale.svelte';
	import ScheduleTimeline from '$lib/components/marketing/ScheduleTimeline.svelte';
	import SitePackVisual from '$lib/components/marketing/SitePackVisual.svelte';
	import { Download } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.page_title_about()}</title>
	<meta name="description" content={m.about_mechanism_description()} />
	<meta property="og:title" content={m.page_title_about()} />
	<meta property="og:description" content={m.about_mechanism_description()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_about()} />
	<meta name="twitter:description" content={m.about_mechanism_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />

<main id="main-content">
	<section class="border-b border-border">
		<div
			class="ace-shell grid gap-12 py-14 lg:grid-cols-[0.78fr_1.22fr] lg:items-center lg:py-20"
		>
			<div class="max-w-xl">
				<p class="font-mono text-xs text-muted-foreground">{m.about_hero_app()}</p>
				<h1
					class="mt-5 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl"
				>
					{m.about_mechanism_title()}
				</h1>
				<p class="mt-6 text-lg leading-relaxed text-muted-foreground">
					{m.about_mechanism_description()}
				</p>
			</div>
			<PolicyVisual />
		</div>
	</section>

	<section class="border-b border-border bg-card">
		<div
			class="ace-shell grid gap-8 py-14 lg:grid-cols-[0.68fr_1.32fr] lg:items-start lg:py-20"
		>
			<div class="max-w-md">
				<p class="font-mono text-xs text-muted-foreground">{m.policy_type()}</p>
				<h2 class="mt-4 font-display text-4xl font-semibold">{m.about_policy_title()}</h2>
				<p class="mt-5 leading-relaxed text-muted-foreground">
					{m.about_policy_description()}
				</p>
			</div>
			<dl class="divide-y divide-border border-y border-border">
				<div class="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:items-baseline">
					<dt class="text-xs text-muted-foreground">{m.policy_target_label()}</dt>
					<dd class="font-display text-xl font-semibold">{m.policy_target_value()}</dd>
				</div>
				<div class="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:items-baseline">
					<dt class="text-xs text-muted-foreground">{m.policy_schedule_label()}</dt>
					<dd class="font-mono text-sm">{m.policy_schedule_time()}</dd>
				</div>
				<div
					class="grid gap-2 border-l-4 border-signal py-4 pl-4 sm:grid-cols-[8rem_1fr] sm:items-baseline"
				>
					<dt class="text-xs text-muted-foreground">{m.policy_lock_title()}</dt>
					<dd class="font-mono text-sm">{m.policy_lock_until()}</dd>
				</div>
			</dl>
		</div>
	</section>

	<section class="border-b border-border py-14 lg:py-20">
		<div class="ace-shell">
			<div class="mb-9 max-w-2xl">
				<p class="font-mono text-xs text-muted-foreground">
					{m.policy_resistance_label()}
				</p>
				<h2 class="mt-4 font-display text-4xl font-semibold">
					{m.about_resistance_title()}
				</h2>
				<p class="mt-5 leading-relaxed text-muted-foreground">
					{m.about_resistance_description()}
				</p>
			</div>
			<ResistanceScale />
		</div>
	</section>

	<section class="border-b border-border bg-card py-14 lg:py-20">
		<div class="ace-shell grid gap-14 lg:grid-cols-2">
			<div>
				<p class="font-mono text-xs text-muted-foreground">
					{m.policy_schedule_label()}
				</p>
				<h2 class="mt-4 font-display text-3xl font-semibold">{m.about_schedule_title()}</h2>
				<p class="mt-4 max-w-lg leading-relaxed text-muted-foreground">
					{m.about_schedule_description()}
				</p>
				<div class="mt-7">
					<ScheduleTimeline />
				</div>
			</div>
			<div>
				<p class="font-mono text-xs text-muted-foreground">{m.site_pack_scope()}</p>
				<h2 class="mt-4 font-display text-3xl font-semibold">{m.about_packs_title()}</h2>
				<p class="mt-4 max-w-lg leading-relaxed text-muted-foreground">
					{m.about_packs_description()}
				</p>
				<div class="mt-7">
					<SitePackVisual />
				</div>
			</div>
		</div>
	</section>

	<section class="py-12 sm:py-16">
		<div class="ace-shell">
			<div
				class="grid overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[1fr_auto] lg:items-center"
			>
				<div class="px-5 py-7 sm:px-8">
					<h2 class="font-display text-3xl font-semibold">{m.about_cta_title()}</h2>
					<p class="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
						{m.about_cta_description()}
					</p>
				</div>
				<div
					class="flex flex-col gap-3 border-t border-border p-5 sm:flex-row lg:border-t-0 lg:border-l lg:p-7"
				>
					<a
						href={resolve('/download')}
						class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
					>
						<Download class="size-4" aria-hidden="true" />
						{m.hero_download_button()}
					</a>
					<a
						href={resolve('/get-pro')}
						class="inline-flex min-h-12 items-center justify-center rounded-md border border-foreground/30 px-5 font-medium hover:bg-accent"
					>
						{m.hero_pro_button()}
					</a>
				</div>
			</div>
		</div>
	</section>
</main>

<MarketingFooter />
