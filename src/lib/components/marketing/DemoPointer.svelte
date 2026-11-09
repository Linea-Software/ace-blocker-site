<script lang="ts">
	import { tick } from 'svelte';
	import { MousePointer2 } from '@lucide/svelte';

	let {
		root,
		target,
		playing
	}: { root: HTMLElement | undefined; target: string; playing: boolean } = $props();
	let left = $state(0);
	let top = $state(0);
	let visible = $state(false);

	$effect(() => {
		const element = root;
		const name = target;
		const active = playing;
		let canceled = false;
		let observer: ResizeObserver | undefined;
		let destination: HTMLElement | null = null;
		function position() {
			if (!element || !destination) return;
			const bounds = element.getBoundingClientRect();
			const control = destination.getBoundingClientRect();
			left = control.left - bounds.left + control.width * 0.62;
			top = control.top - bounds.top + control.height * 0.55;
		}
		if (element && name && active) {
			void tick().then(() => {
				if (canceled) return;
				destination = element.querySelector<HTMLElement>(
					'[data-demo-target="' + name + '"]'
				);
				if (!destination) {
					visible = false;
					return;
				}
				position();
				visible = true;
				observer = new ResizeObserver(position);
				observer.observe(element);
				observer.observe(destination);
				window.addEventListener('resize', position);
			});
		} else {
			visible = false;
		}
		return () => {
			canceled = true;
			observer?.disconnect();
			window.removeEventListener('resize', position);
		};
	});
</script>

{#if playing && visible}
	<span class="demo-pointer" aria-hidden="true" style:left={left + 'px'} style:top={top + 'px'}>
		<MousePointer2 size={23} fill="var(--foreground)" strokeWidth={1.5} />
	</span>
{/if}

<style>
	.demo-pointer {
		position: absolute;
		z-index: 10;
		display: block;
		color: var(--background);
		pointer-events: none;
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.3));
		transition:
			left 550ms cubic-bezier(0.22, 0.8, 0.24, 1),
			top 550ms cubic-bezier(0.22, 0.8, 0.24, 1);
	}
	@media (prefers-reduced-motion: reduce) {
		.demo-pointer {
			transition: none;
		}
	}
</style>
