<script lang="ts">
	import { tick } from 'svelte';
	import { MousePointer2 } from '@lucide/svelte';
	import type { DemoPhase } from './DemoPlayback.svelte';

	let {
		root,
		target,
		visible,
		phase = 'idle',
		travelMs = 660
	}: {
		root: HTMLElement | undefined;
		target: string;
		visible: boolean;
		phase?: DemoPhase;
		travelMs?: number;
	} = $props();

	let x = $state(28);
	let y = $state(70);
	let initialized = $state(false);
	const pressed = $derived(phase === 'press');

	$effect(() => {
		const container = root;
		const name = target;
		const enabled = visible;
		if (!container || !enabled) {
			initialized = false;
			return;
		}
		let disposed = false;
		let frame = 0;
		let observer: ResizeObserver | undefined;
		let node: HTMLElement | null = null;

		// The pointer remains mounted across editor stages instead of teleporting.
		if (!initialized) {
			x = Math.min(34, container.clientWidth * 0.08);
			y = Math.min(90, container.clientHeight * 0.18);
			initialized = true;
		}
		const update = () => {
			if (disposed || !node) return;
			const rect = container.getBoundingClientRect();
			const bounds = node.getBoundingClientRect();
			if (!bounds.width && !bounds.height) return;
			const nextX = bounds.left - rect.left + bounds.width * 0.56;
			const nextY = bounds.top - rect.top + bounds.height * 0.56;
			cancelAnimationFrame(frame);
			frame = requestAnimationFrame(() => {
				if (disposed) return;
				x = Math.max(6, Math.min(rect.width - 26, nextX));
				y = Math.max(6, Math.min(rect.height - 30, nextY));
			});
		};
		void tick().then(() => {
			if (disposed) return;
			node = container.querySelector<HTMLElement>(
				'[data-demo-target="' + CSS.escape(name) + '"]'
			);
			if (!node) return;
			frame = requestAnimationFrame(update);
			observer = new ResizeObserver(update);
			observer.observe(container);
			observer.observe(node);
			window.addEventListener('resize', update);
		});
		return () => {
			disposed = true;
			cancelAnimationFrame(frame);
			observer?.disconnect();
			window.removeEventListener('resize', update);
		};
	});
</script>

{#if visible}
	<span
		class="demo-pointer"
		class:pressed
		aria-hidden="true"
		data-demo-pointer-phase={phase}
		data-demo-pointer-target={target}
		style:--cursor-x={x + 'px'}
		style:--cursor-y={y + 'px'}
		style:--cursor-travel={travelMs + 'ms'}
	>
		<MousePointer2 size={22} fill="var(--foreground)" strokeWidth={1.6} />
		<span class="click-ring"></span>
	</span>
{/if}

<style>
	.demo-pointer {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 25;
		display: block;
		width: 24px;
		height: 24px;
		color: var(--background);
		pointer-events: none;
		transform: translate3d(var(--cursor-x), var(--cursor-y), 0);
		transition: transform var(--cursor-travel) cubic-bezier(0.27, 0.75, 0.24, 1);
		filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.4));
		will-change: transform;
		animation: pointer-enter 220ms ease-out both;
	}
	.demo-pointer :global(svg) {
		transform-origin: 2px 2px;
		transition: transform 110ms ease-out;
	}
	.demo-pointer.pressed :global(svg) {
		transform: scale(0.79);
	}
	.click-ring {
		position: absolute;
		top: -7px;
		left: -7px;
		width: 30px;
		height: 30px;
		border: 2px solid var(--signal-deep);
		border-radius: 50%;
		opacity: 0;
		transform: scale(0.4);
	}
	.pressed .click-ring {
		animation: cursor-click 340ms ease-out forwards;
	}
	@keyframes pointer-enter {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
	@keyframes cursor-click {
		0% {
			opacity: 0.85;
			transform: scale(0.4);
		}
		100% {
			opacity: 0;
			transform: scale(1.2);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.demo-pointer {
			display: none;
		}
	}
</style>
