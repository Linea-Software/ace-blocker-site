<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Sun, Moon } from '@lucide/svelte';
	import { toggleMode } from 'mode-watcher';
</script>

<Button
	variant="ghost"
	size="icon"
	class="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
	onclick={toggleMode}
>
	<Sun
		class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
	/>
	<Moon
		class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
	/>
	<span class="sr-only">Toggle theme</span>
</Button>
