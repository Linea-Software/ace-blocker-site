import { Moon, Sun } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
export function toggleAceTheme() {
	const root = document.documentElement;
	const next = root.classList.contains('dark') ? 'light' : 'dark';
	root.classList.toggle('dark', next === 'dark');
	root.style.colorScheme = next;
	localStorage.setItem('mode', next);
	document.cookie = 'mode=' + next + '; path=/; SameSite=Lax';
}
export default function ThemeToggleButton() {
	return (
		<button
			type="button"
			class="relative flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
			aria-label={m.auth_theme_toggle()}
			onClick={toggleAceTheme}
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
	);
}
