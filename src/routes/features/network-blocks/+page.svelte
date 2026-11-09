<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import NetworkBlockDemo from '$lib/components/marketing/NetworkBlockDemo.svelte';
	import * as m from '$lib/paraglide/messages';
	import { page } from '$app/state';
	import { canonicalUrl } from '$lib/seo';
	import { localizeHref } from '$lib/paraglide/runtime';
	import { resolve } from '$app/paths';
	let { data } = $props();
	const explanations = [
		{ title: m.feature_blocks_choose, body: m.feature_blocks_choose_body },
		{ title: m.feature_blocks_when, body: m.feature_blocks_when_body },
		{ title: m.feature_blocks_lock, body: m.feature_blocks_lock_body },
		{ title: m.feature_blocks_result, body: m.feature_blocks_result_body }
	];
</script>

<svelte:head>
	<title>{m.feature_blocks_title()} — Ace Blocker</title>
	<meta name="description" content={m.feature_blocks_description()} />
	<meta property="og:title" content={m.feature_blocks_title()} />
	<meta property="og:description" content={m.feature_blocks_description()} />
	<meta property="og:url" content={canonicalUrl(page.url.pathname)} />
	<meta name="twitter:title" content={m.feature_blocks_title()} />
	<meta name="twitter:description" content={m.feature_blocks_description()} />
</svelte:head>

<Navbar isPro={data.isPro} />
<main id="main-content">
	<section class="border-b border-border">
		<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[.7fr_1.3fr] lg:items-start lg:py-20">
			<div>
				<p class="font-mono text-xs text-muted-foreground">{m.policy_type()}</p>
				<h1
					class="mt-4 font-display text-5xl leading-[.95] font-semibold tracking-tight sm:text-6xl"
				>
					{m.feature_blocks_title()}
				</h1>
				<p class="mt-6 text-lg leading-relaxed text-muted-foreground">
					{m.feature_blocks_description()}
				</p>
				<p class="mt-5 text-sm leading-relaxed">{m.feature_blocks_instructions()}</p>
			</div>
			<NetworkBlockDemo />
		</div>
	</section>
	<section class="border-b border-border bg-card py-14 sm:py-20">
		<div class="ace-shell">
			<h2 class="max-w-2xl font-display text-3xl font-semibold sm:text-4xl">
				{m.feature_blocks_explained()}
			</h2>
			<dl class="mt-9 grid gap-x-10 gap-y-0 md:grid-cols-2">
				{#each explanations as item (item.title())}
					<div class="border-t border-border py-6">
						<dt class="font-display text-2xl font-semibold">{item.title()}</dt>
						<dd class="mt-3 max-w-xl leading-relaxed text-muted-foreground">
							{item.body()}
						</dd>
					</div>
				{/each}
			</dl>
			<p class="mt-5 max-w-3xl border-l-4 border-signal pl-4 text-sm leading-relaxed">
				{m.feature_blocks_lock_notice()}
			</p>
		</div>
	</section>
	<section class="py-12">
		<div class="ace-shell flex flex-wrap items-center justify-between gap-5">
			<p class="font-display text-2xl font-semibold">{m.feature_resistance_comparison()}</p>
			<a
				class="min-h-11 rounded border border-border px-4 py-3 text-sm font-semibold hover:bg-accent"
				href={resolve(localizeHref('/features/resistance') as '/features/resistance')}
				>{m.feature_explore_resistance()}</a
			>
		</div>
	</section>
</main>
<MarketingFooter />
