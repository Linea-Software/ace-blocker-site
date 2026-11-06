<script lang="ts">
	import { page } from '$app/state';
	import { Globe2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { languageSwitchHref } from '$lib/components/language-switch';

	let { mobile = false }: { mobile?: boolean } = $props();
	const activeLocale = $derived(page.url.pathname.match(/^\/(it|de)(?:\/|$)/)?.[1] ?? 'en');

	function selectLanguage(value: string) {
		if ((value !== 'it' && value !== 'en' && value !== 'de') || value === activeLocale) return;
		const destination = languageSwitchHref(page.url, value);
		// Full navigation allows Paraglide's URL-first SSR and metadata to
		// select the new locale, while preserving path, query and fragment.
		window.location.assign(destination);
	}
</script>

<div
	class={mobile
		? 'flex min-h-14 items-center justify-between gap-3 border-b border-border px-5'
		: 'hidden items-center gap-1.5 md:flex'}
>
	<label
		for={mobile ? 'nav-language-mobile' : 'nav-language-desktop'}
		class={mobile ? 'flex items-center gap-3 text-sm font-medium' : 'sr-only'}
	>
		<Globe2 class="size-4" aria-hidden="true" />
		{m.nav_language_label()}
	</label>
	<select
		id={mobile ? 'nav-language-mobile' : 'nav-language-desktop'}
		aria-label={m.nav_language_label()}
		class={mobile
			? 'min-h-11 rounded border border-border bg-card px-3 text-sm text-foreground'
			: 'min-h-10 max-w-25 rounded border border-border bg-card px-2 text-xs font-medium text-foreground'}
		value={activeLocale}
		onchange={(event) => selectLanguage(event.currentTarget.value)}
	>
		<option value="en">English</option>
		<option value="it">Italiano</option>
		<option value="de">Deutsch</option>
	</select>
</div>
