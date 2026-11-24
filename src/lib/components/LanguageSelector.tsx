import { Globe2 } from '@lucide/solid';
import { useLocation } from '@solidjs/router';
import * as m from '$lib/paraglide/messages.js';
import { languageSwitchHref, type AvailableSiteLocale } from '$lib/components/language-switch';

export default function LanguageSelector(props: { mobile?: boolean }) {
	const location = useLocation();
	const activeLocale = () => location.pathname.match(/^\/(it|de|es)(?:\/|$)/)?.[1] ?? 'en';
	const selectLanguage = (value: string) => {
		if (!['en', 'it', 'de', 'es'].includes(value) || value === activeLocale()) return;
		// Use a full navigation so server-rendered locale and SEO metadata agree.
		window.location.assign(
			languageSwitchHref(new URL(window.location.href), value as AvailableSiteLocale)
		);
	};
	return (
		<div
			class={
				props.mobile
					? 'flex min-h-14 items-center justify-between gap-3 border-b border-border px-5'
					: 'hidden items-center gap-1.5 md:flex'
			}
		>
			<label
				for={props.mobile ? 'nav-language-mobile' : 'nav-language-desktop'}
				class={props.mobile ? 'flex items-center gap-3 text-sm font-medium' : 'sr-only'}
			>
				<Globe2 class="size-4" aria-hidden="true" />
				{m.nav_language_label()}
			</label>
			<select
				id={props.mobile ? 'nav-language-mobile' : 'nav-language-desktop'}
				aria-label={m.nav_language_label()}
				class={
					props.mobile
						? 'min-h-11 rounded border border-border bg-card px-3 text-sm text-foreground'
						: 'min-h-10 max-w-25 rounded border border-border bg-card px-2 text-xs font-medium text-foreground'
				}
				value={activeLocale()}
				onChange={(event) => selectLanguage(event.currentTarget.value)}
			>
				<option value="en">English</option>
				<option value="it">Italiano</option>
				<option value="de">Deutsch</option>
				<option value="es">Español</option>
			</select>
		</div>
	);
}
