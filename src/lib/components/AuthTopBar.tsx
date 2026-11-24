import { ArrowLeft, Moon, Sun } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';

function toggleTheme() {
	// Matches the existing mode-watcher persistence key used by the Svelte site.
	const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
	document.documentElement.classList.toggle('dark', next === 'dark');
	document.documentElement.style.colorScheme = next;
	localStorage.setItem('mode', next);
	document.cookie = 'mode=' + next + '; path=/; SameSite=Lax';
}
export default function AuthTopBar(props: { backHref?: '/' | '/signin'; backLabel: string }) {
	return (
		<div class="mb-8 flex w-full max-w-md items-center justify-between lg:absolute lg:top-8 lg:right-8 lg:mb-0 lg:w-auto lg:max-w-none lg:justify-end lg:gap-3">
			<button
				type="button"
				onClick={toggleTheme}
				aria-label={m.auth_theme_toggle()}
				class="relative flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<Sun
					class="size-[1.1rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
					aria-hidden="true"
				/>
				<Moon
					class="absolute size-[1.1rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
					aria-hidden="true"
				/>
			</button>
			<a
				href={props.backHref ?? '/'}
				class="inline-flex min-h-10 items-center gap-2 rounded-md px-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				{props.backLabel}
			</a>
		</div>
	);
}
