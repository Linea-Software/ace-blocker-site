<script lang="ts">
	import darkLockup from '$lib/assets/logo/ace-lockup-dark-no-tagline-transparent.svg';
	import lightLockup from '$lib/assets/logo/ace-lockup-light-no-tagline-transparent.svg';

	let {
		alt,
		class: className = '',
		variant = 'auto'
	}: {
		alt: string;
		class?: string;
		variant?: 'auto' | 'light' | 'dark';
	} = $props();
</script>

{#if variant === 'dark'}
	<img src={darkLockup} {alt} class={className} />
{:else if variant === 'light'}
	<img src={lightLockup} {alt} class={className} />
{:else}
	<img src={lightLockup} {alt} class={`${className} dark:hidden`} />
	<img src={darkLockup} {alt} class={`${className} hidden dark:block`} />
{/if}
