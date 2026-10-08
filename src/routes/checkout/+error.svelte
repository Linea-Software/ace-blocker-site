<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import * as m from '$lib/paraglide/messages';
</script>

<svelte:head>
	<title>{m.inline_checkout_unavailable_title()}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<Navbar isPro={false} />
<main id="main-content" class="ace-shell min-h-[55vh] py-16 sm:py-24">
	<div class="max-w-xl border-l-4 border-signal pl-6">
		<p class="font-mono text-xs text-muted-foreground">{page.status}</p>
		<h1 class="mt-3 font-display text-4xl font-semibold">
			{m.inline_checkout_unavailable_title()}
		</h1>
		<p class="mt-4 text-muted-foreground">{m.inline_checkout_unavailable_body()}</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a
				href={page.url.pathname + page.url.search}
				class="inline-flex min-h-11 items-center rounded-md bg-foreground px-5 font-medium text-background"
				>{m.inline_checkout_retry()}</a
			>
			<a
				href={resolve('/get-pro')}
				class="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-medium"
				>{m.inline_checkout_back()}</a
			>
		</div>
	</div>
</main>
<MarketingFooter />
