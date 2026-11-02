<script lang="ts">
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
</script>

<footer class="border-t border-border bg-card">
	<div class="ace-shell grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
		<div>
			<a href={localizeHref(resolve('/'))} class="inline-flex items-center">
				<BrandLogo alt={m.about_hero_app()} class="h-7 w-auto" />
			</a>
			<p class="mt-4 max-w-md text-sm text-muted-foreground">{m.footer_identity_line()}</p>
		</div>
		<div class="sm:text-right">
			<a href={localizeHref(resolve('/faq'))} class="text-sm font-medium hover:underline"
				>{m.nav_faq()}</a
			>
			<nav class="flex gap-5 text-sm" aria-label={m.footer_legal_navigation()}>
				<a href={localizeHref(resolve('/terms'))} class="hover:underline"
					>{m.footer_terms()}</a
				>
				<a href={localizeHref(resolve('/privacy'))} class="hover:underline"
					>{m.footer_privacy()}</a
				>
			</nav>
			<p class="mt-4 text-xs text-muted-foreground">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
		</div>
	</div>
</footer>
