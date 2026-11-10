<script lang="ts">
	import { ArrowLeft, ArrowRight, CornerDownLeft, Globe2, RotateCw, X } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let {
		domain,
		phase,
		blocked,
		onAddress,
		onNavigate,
		onBack
	}: {
		domain: string;
		phase: 'ready' | 'typed' | 'loading' | 'result';
		blocked: boolean;
		onAddress: () => void;
		onNavigate: () => void;
		onBack: () => void;
	} = $props();
</script>

<section
	class="browser-scene"
	aria-label={m.demo_browser_heading()}
	data-testid="blocked-browser-demo"
>
	<div class="browser-scene-header">
		<div>
			<span class="eyebrow">{m.demo_browser_simulated_time()}</span>
			<h3>{m.demo_browser_heading()}</h3>
		</div>
		<button type="button" class="back-to-rule" onclick={onBack}>
			<ArrowLeft size={15} aria-hidden="true" />{m.demo_browser_back()}
		</button>
	</div>
	<div class="browser-window" aria-label={m.demo_browser_window_label()}>
		<div class="browser-chrome">
			<div class="window-controls" aria-hidden="true">
				<span></span><span></span><span></span>
			</div>
			<div class="navigation-icons" aria-hidden="true">
				<ArrowLeft size={14} /><ArrowRight size={14} /><RotateCw size={13} />
			</div>
			<div class="address-container">
				<button
					type="button"
					class="address-bar"
					class:address-active={phase === 'typed'}
					data-demo-target="browser-address"
					aria-label={m.demo_browser_address()}
					onclick={onAddress}
				>
					<Globe2 size={13} aria-hidden="true" />
					{#if phase === 'ready'}
						<span class="placeholder">{m.demo_browser_address_hint()}</span>
					{:else}
						<span class:typing={phase === 'typed'} class="browser-url"
							>https://{domain}</span
						>
					{/if}
				</button>
				<button
					type="button"
					class="navigate"
					data-demo-target="browser-go"
					aria-label={m.demo_browser_navigate()}
					disabled={phase === 'ready' || phase === 'loading'}
					onclick={onNavigate}
				>
					<CornerDownLeft size={15} aria-hidden="true" />
				</button>
			</div>
			<X class="chrome-close" size={13} aria-hidden="true" />
		</div>
		<div class="browser-page" aria-live="polite" aria-atomic="true">
			{#if phase === 'ready' || phase === 'typed'}
				<div class="page-placeholder">
					<Globe2 size={28} aria-hidden="true" />
					<p>{m.demo_browser_ready()}</p>
				</div>
			{:else if phase === 'loading'}
				<div class="page-placeholder">
					<span class="loading-ring" aria-hidden="true"></span>
					<p>{m.demo_browser_loading()}</p>
				</div>
			{:else if blocked}
				<div class="response">
					<span class="http-status">HTTP 404</span>
					<strong>404</strong>
					<h4>{m.demo_browser_404_title()}</h4>
					<p>{m.demo_browser_404_description()}</p>
				</div>
			{:else}
				<div class="response">
					<span class="http-status">HTTP</span>
					<h4>{m.demo_browser_allowed_title()}</h4>
					<p>{m.demo_browser_allowed_description()}</p>
				</div>
			{/if}
		</div>
	</div>
	<div class="browser-caption">
		<p>
			{phase === 'result'
				? blocked
					? m.demo_browser_404_explanation()
					: m.demo_browser_allowed_explanation()
				: m.demo_browser_preview_note()}
		</p>
	</div>
</section>

<style>
	.browser-scene {
		padding: 18px 20px 20px;
	}
	.browser-scene-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		flex-wrap: wrap;
		margin-bottom: 14px;
	}
	.eyebrow {
		font:
			11px 'IBM Plex Mono',
			monospace;
		color: var(--signal-deep);
	}
	.browser-scene h3 {
		margin: 4px 0 0;
		font:
			600 21px/1.15 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.back-to-rule {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		min-height: 40px;
		border: 1px solid var(--border);
		background: var(--card);
		border-radius: 4px;
		color: var(--foreground);
		padding: 7px 10px;
		font-size: 12px;
		cursor: pointer;
	}
	.back-to-rule:hover {
		background: var(--muted);
	}
	.browser-window {
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: #fff;
	}
	.browser-chrome {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		background: var(--muted);
		border-bottom: 1px solid var(--border);
	}
	.window-controls {
		display: flex;
		gap: 5px;
		flex-shrink: 0;
	}
	.window-controls span {
		width: 7px;
		height: 7px;
		border: 1px solid var(--border);
		border-radius: 50%;
		background: var(--card);
	}
	.navigation-icons {
		display: flex;
		align-items: center;
		gap: 9px;
		flex-shrink: 0;
		color: var(--muted-foreground);
	}
	.address-container {
		display: flex;
		align-items: center;
		gap: 5px;
		flex: 1;
		min-width: 0;
	}
	.address-bar {
		display: flex;
		align-items: center;
		gap: 7px;
		width: 100%;
		min-width: 0;
		min-height: 34px;
		padding: 6px 10px;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--card);
		color: var(--foreground);
		font:
			12px 'IBM Plex Mono',
			monospace;
		cursor: text;
		text-align: left;
	}
	.address-bar :global(svg) {
		flex-shrink: 0;
		color: var(--muted-foreground);
	}
	.address-active {
		border-color: var(--signal-deep);
	}
	.browser-url {
		white-space: nowrap;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.browser-url.typing {
		animation: reveal-url 750ms steps(22, end) both;
	}
	.placeholder {
		color: var(--muted-foreground);
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.navigate {
		display: grid;
		place-items: center;
		flex: 0 0 34px;
		height: 34px;
		border: 1px solid var(--border);
		border-radius: 4px;
		color: var(--foreground);
		background: var(--card);
		cursor: pointer;
	}
	.navigate:hover:not(:disabled) {
		border-color: var(--signal-deep);
	}
	.navigate:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}
	.browser-chrome :global(.chrome-close) {
		color: var(--muted-foreground);
		flex-shrink: 0;
	}
	.browser-page {
		display: grid;
		place-items: center;
		min-height: 230px;
		padding: 28px 16px;
		text-align: center;
		color: #222;
		background: #fff;
	}
	.page-placeholder {
		display: grid;
		justify-items: center;
		gap: 14px;
		color: #737373;
		font-size: 13px;
	}
	.page-placeholder p {
		margin: 0;
	}
	.loading-ring {
		width: 27px;
		height: 27px;
		border: 2px solid #d4d4d4;
		border-top-color: #555;
		border-radius: 50%;
		animation: spin 800ms linear infinite;
	}
	.response {
		max-width: 340px;
	}
	.response .http-status {
		display: block;
		margin-bottom: 9px;
		color: #555;
		font:
			11px 'IBM Plex Mono',
			monospace;
	}
	.response strong {
		display: block;
		font:
			600 55px/1 'IBM Plex Sans Condensed',
			sans-serif;
		letter-spacing: -0.04em;
	}
	.response h4 {
		margin: 8px 0;
		font:
			600 22px 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.response p {
		margin: 0;
		font-size: 12px;
		line-height: 1.6;
		color: #555;
	}
	.browser-caption {
		min-height: 37px;
		padding-top: 11px;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.5;
	}
	.browser-caption p {
		margin: 0;
	}
	button:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	@keyframes reveal-url {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (max-width: 550px) {
		.browser-scene {
			padding: 14px 12px 16px;
		}
		.browser-chrome {
			gap: 6px;
			padding: 8px;
		}
		.navigation-icons {
			gap: 5px;
		}
		.browser-chrome :global(.chrome-close) {
			display: none;
		}
		.browser-page {
			min-height: 220px;
		}
	}
	@media (max-width: 350px) {
		.navigation-icons {
			display: none;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.browser-url.typing,
		.loading-ring {
			animation: none;
			clip-path: none;
		}
	}
</style>
