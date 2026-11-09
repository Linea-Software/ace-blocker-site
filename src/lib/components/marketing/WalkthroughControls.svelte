<script lang="ts">
	import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import type { DemoPlayback } from './DemoPlayback.svelte';

	let { playback }: { playback: DemoPlayback } = $props();
</script>

<div class="walkthrough" role="group" aria-label={m.demo_walkthrough_label()}>
	<div class="walkthrough-actions">
		{#if playback.playing}
			<button type="button" onclick={() => playback.pause()} aria-label={m.demo_pause()}>
				<Pause size={15} aria-hidden="true" />
				{m.demo_pause()}
			</button>
		{:else}
			<button type="button" onclick={() => playback.play()} aria-label={m.demo_play()}>
				<Play size={15} aria-hidden="true" />
				{m.demo_play()}
			</button>
		{/if}
		<button type="button" onclick={() => playback.replay()} aria-label={m.demo_replay()}>
			<RotateCcw size={15} aria-hidden="true" />
			{m.demo_replay()}
		</button>
	</div>
	<div class="walkthrough-actions">
		<span class="progress" aria-live="polite"
			>{m.demo_progress({ current: playback.step + 1, total: playback.total })}</span
		>
		<button
			type="button"
			onclick={() => playback.previous()}
			disabled={playback.step < 0}
			aria-label={m.demo_previous()}
		>
			<ArrowLeft size={16} aria-hidden="true" />
		</button>
		<button
			type="button"
			onclick={() => playback.next()}
			disabled={playback.step === playback.total - 1}
			aria-label={m.demo_next()}
		>
			<ArrowRight size={16} aria-hidden="true" />
		</button>
	</div>
</div>

<style>
	.walkthrough {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		border-top: 1px solid var(--border);
		background: var(--muted);
	}
	.walkthrough-actions {
		display: flex;
		align-items: center;
		gap: 5px;
	}
	button {
		display: inline-flex;
		min-height: 36px;
		min-width: 36px;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 6px 10px;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--card);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		background: var(--accent);
	}
	button:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	button:disabled {
		cursor: not-allowed;
		opacity: 0.35;
	}
	.progress {
		margin-right: 5px;
		color: var(--muted-foreground);
		font:
			11px 'IBM Plex Mono',
			monospace;
		white-space: nowrap;
	}
</style>
