<script lang="ts">
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';

	let { alt, class: className = '' } = $props<{ alt: string; class?: string }>();
</script>

<img src={lightFullLogo} {alt} class={`${className} dark:hidden`} />
<img src={darkFullLogo} {alt} class={`${className} hidden dark:block`} />
