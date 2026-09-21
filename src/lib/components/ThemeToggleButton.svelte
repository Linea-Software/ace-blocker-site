<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon } from '@lucide/svelte';
	import { toggleMode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
</script>

<Button
	variant="ghost"
	size="icon"
	class="relative h-11 w-11 rounded-md text-muted-foreground hover:text-foreground"
	onclick={toggleMode}
	aria-label={m.auth_theme_toggle()}
>
	<Sun
		class="size-[1.1rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
		aria-hidden="true"
	/>
	<Moon
		class="absolute size-[1.1rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
		aria-hidden="true"
	/>
</Button>
