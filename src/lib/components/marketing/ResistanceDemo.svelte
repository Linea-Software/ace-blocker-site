<script lang="ts">
	import { onDestroy } from 'svelte';
	import {
		ChevronDown,
		ChevronRight,
		ListFilter,
		PlaySquare,
		Palette,
		Hourglass,
		ShieldQuestionMark,
		Globe
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { DemoPlayback } from './DemoPlayback.svelte';
	import WalkthroughControls from './WalkthroughControls.svelte';
	import DemoPointer from './DemoPointer.svelte';

	let { compact = false }: { compact?: boolean } = $props();
	type Kind = 'feeds' | 'video' | 'visual' | 'interruptions' | 'captcha';
	type Script = { id: string; site: string; title: () => string };
	type Section = {
		kind: Kind;
		title: () => string;
		description: () => string;
		scripts: Script[];
	};
	const sections: Section[] = [
		{
			kind: 'feeds',
			title: m.demo_feeds,
			description: m.demo_feeds_help,
			scripts: [
				{
					id: 'reddit_hide_recommendations',
					site: 'reddit.com',
					title: m.demo_feed_action
				},
				{ id: 'x_hide_trends', site: 'x.com', title: m.demo_trends_action }
			]
		},
		{
			kind: 'video',
			title: m.demo_videos,
			description: m.demo_videos_help,
			scripts: [
				{ id: 'youtube_shorts_remove', site: 'youtube.com', title: m.demo_shorts_action },
				{
					id: 'netflix_disable_autoplay_previews',
					site: 'netflix.com',
					title: m.demo_autoplay_action
				}
			]
		},
		{
			kind: 'visual',
			title: m.demo_visual,
			description: m.demo_visual_help,
			scripts: [
				{ id: 'reddit_grayscale', site: 'reddit.com', title: m.demo_grayscale_action },
				{ id: 'youtube_low_quality', site: 'youtube.com', title: m.demo_quality_action }
			]
		},
		{
			kind: 'interruptions',
			title: m.demo_delays,
			description: m.demo_delays_help,
			scripts: [
				{ id: 'youtube_audio_delay', site: 'youtube.com', title: m.demo_audio_action },
				{ id: 'reddit_limit_scrolling', site: 'reddit.com', title: m.demo_scroll_action }
			]
		},
		{
			kind: 'captcha',
			title: m.demo_captcha,
			description: m.demo_captcha_help,
			scripts: [
				{ id: 'reddit_random_captcha', site: 'reddit.com', title: m.demo_verify_action },
				{ id: 'youtube_random_captcha', site: 'youtube.com', title: m.demo_verify_action }
			]
		}
	];
	let selected = $state<string[]>([]);
	let openKind = $state<Kind | null>(null);
	let openSite = $state<string | null>(null);
	let host = $state<HTMLElement>();
	const enabled = (kind: Kind) =>
		sections
			.find((section) => section.kind === kind)
			?.scripts.some((item) => selected.includes(item.id)) ?? false;
	function applyScript(step: number) {
		selected = [];
		if (step >= 0) selected.push('reddit_hide_recommendations', 'x_hide_trends');
		if (step >= 1) selected.push('reddit_grayscale');
		if (step >= 2) selected.push('youtube_shorts_remove');
		if (step >= 3) selected.push('youtube_audio_delay');
		if (step >= 4) selected.push('reddit_random_captcha');
		openKind = null;
		openSite = null;
	}
	const playback = new DemoPlayback(5, applyScript);
	const pointerTarget = $derived(
		['feeds', 'visual', 'video', 'interruptions', 'captcha'][playback.step] ?? ''
	);
	onDestroy(() => playback.dispose());
	function toggleGroup(section: Section) {
		playback.manual();
		const all = section.scripts.every((script) => selected.includes(script.id));
		const ids = section.scripts.map((script) => script.id);
		selected = all
			? selected.filter((id) => !ids.includes(id))
			: [...new Set([...selected, ...ids])];
	}
	function toggleScript(id: string, checked: boolean) {
		playback.manual();
		selected = checked
			? [...new Set([...selected, id])]
			: selected.filter((item) => item !== id);
	}
</script>

<section
	class:compact
	class="resistance-demo"
	data-testid="resistance-demo"
	aria-label={m.demo_resistance_label()}
	bind:this={host}
>
	<div class="demo-meta">
		<span>{m.demo_resistance_label()}</span><span>{m.demo_simulation()}</span>
	</div>
	<div class="demo-content">
		<div class="groups">
			<div class="group-intro">
				<h3>{m.demo_interventions_heading()}</h3>
				<p>{m.demo_interventions_help()}</p>
			</div>
			{#each sections as section (section.kind)}
				{@const all = section.scripts.every((script) => selected.includes(script.id))}
				{@const count = section.scripts.filter((script) =>
					selected.includes(script.id)
				).length}
				{@const partial = count > 0 && !all}
				<div class="category" data-testid={'category-' + section.kind}>
					<div class="category-header">
						<button
							type="button"
							class="disclosure"
							aria-expanded={openKind === section.kind}
							aria-controls={'demo-group-' + section.kind}
							onclick={() => {
								playback.manual();
								openKind = openKind === section.kind ? null : section.kind;
								openSite = null;
							}}
						>
							<span class="category-icon">
								{#if section.kind === 'feeds'}<ListFilter
										size={19}
										aria-hidden="true"
									/>
								{:else if section.kind === 'video'}<PlaySquare
										size={19}
										aria-hidden="true"
									/>
								{:else if section.kind === 'visual'}<Palette
										size={19}
										aria-hidden="true"
									/>
								{:else if section.kind === 'interruptions'}<Hourglass
										size={19}
										aria-hidden="true"
									/>
								{:else}<ShieldQuestionMark size={19} aria-hidden="true" />{/if}
							</span>
							<span class="category-copy"
								><strong>{section.title()}</strong>{#if !compact}<small
										>{section.description()}</small
									>{/if}</span
							>
							<span class="selection-count">{count}/{section.scripts.length}</span>
							<ChevronDown
								size={15}
								aria-hidden="true"
								class={openKind === section.kind ? 'rotated' : ''}
							/>
						</button>
						<label
							class="all-toggle"
							class:guide-active={playback.playing && pointerTarget === section.kind}
							data-demo-target={section.kind}
							title={m.demo_select_category({ category: section.title() })}
						>
							<input
								type="checkbox"
								checked={all}
								indeterminate={partial}
								aria-label={m.demo_select_category({ category: section.title() })}
								onchange={() => toggleGroup(section)}
							/>
						</label>
					</div>
					{#if openKind === section.kind}
						<div class="site-groups" id={'demo-group-' + section.kind}>
							{#each section.scripts as script (script.id)}
								<div class="site">
									<button
										type="button"
										aria-expanded={openSite === script.id}
										onclick={() => {
											playback.manual();
											openSite = openSite === script.id ? null : script.id;
										}}
									>
										<Globe size={15} aria-hidden="true" /><span
											>{script.site}</span
										>
										<ChevronRight
											size={15}
											aria-hidden="true"
											class={openSite === script.id ? 'rotated' : ''}
										/>
									</button>
									{#if openSite === script.id}
										<label class="script-row"
											><input
												type="checkbox"
												checked={selected.includes(script.id)}
												onchange={(event) =>
													toggleScript(
														script.id,
														event.currentTarget.checked
													)}
											/><span>{script.title()}</span></label
										>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
			<p class="category-footnote">{m.demo_captcha_default()}</p>
		</div>
		<div class="preview">
			<div class="preview-head">
				<strong>{m.demo_before_after()}</strong><span>{m.demo_fake_site()}</span>
			</div>
			<div class="preview-grid">
				<div class="mock-site">
					<div class="browser-bar">
						<span></span><span></span><span></span><strong>sample.social</strong>
					</div>
					<div class="mock-body">
						<div class="mock-title">{m.demo_example_feed()}</div>
						<div class="mock-media"><span class="play-symbol">▶</span></div>
						<div class="mock-line"></div>
						<div class="mock-line narrow"></div>
						<div class="recommendations">
							<strong>{m.demo_suggestions()}</strong>
							<div class="mock-line"></div>
							<div class="mock-line narrow"></div>
						</div>
					</div>
					<div class="preview-caption">{m.demo_before()}</div>
				</div>
				<div class="mock-site after">
					<div class="browser-bar">
						<span></span><span></span><span></span><strong>sample.social</strong>
					</div>
					<div class:desaturated={enabled('visual')} class="mock-body">
						<div class="mock-title">{m.demo_example_feed()}</div>
						<div class="mock-media" class:dimmed={enabled('video')}>
							<span class="play-symbol">{enabled('video') ? 'Ⅱ' : '▶'}</span>
						</div>
						<div class="mock-line"></div>
						<div class="mock-line narrow"></div>
						{#if enabled('feeds')}
							<div class="removed" role="status">{m.demo_suggestions_hidden()}</div>
						{:else}
							<div class="recommendations">
								<strong>{m.demo_suggestions()}</strong>
								<div class="mock-line"></div>
								<div class="mock-line narrow"></div>
							</div>
						{/if}
						{#if enabled('interruptions')}<div class="simulation-banner">
								{m.demo_delay_preview()}
							</div>{/if}
					</div>
					{#if enabled('captcha')}
						<div class="mock-verification" role="status">
							<ShieldQuestionMark size={18} aria-hidden="true" /><span
								>{m.demo_verification_preview()}</span
							>
						</div>
					{/if}
					<div class="preview-caption">{m.demo_after()}</div>
				</div>
			</div>
			<p class="preview-disclaimer" aria-live="polite">{m.demo_preview_disclaimer()}</p>
		</div>
	</div>
	{#if !compact}
		<WalkthroughControls {playback} />
		<DemoPointer root={host} target={pointerTarget} playing={playback.playing} />
	{/if}
</section>

<style>
	.resistance-demo {
		position: relative;
		min-width: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 7px;
		background: var(--card);
	}
	.demo-meta {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 10px;
		padding: 12px 16px;
		border-bottom: 1px solid var(--border);
		color: var(--muted-foreground);
		font:
			12px 'IBM Plex Mono',
			monospace;
	}
	.demo-meta span:last-child {
		color: var(--signal-deep);
	}
	.demo-content {
		display: grid;
		grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
		gap: 0;
	}
	.groups {
		padding: 18px;
		min-width: 0;
		border-right: 1px solid var(--border);
	}
	.group-intro {
		margin-bottom: 14px;
	}
	.group-intro h3 {
		margin: 0;
		font:
			600 21px 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.group-intro p {
		margin: 5px 0 0;
		color: var(--muted-foreground);
		font-size: 12px;
		line-height: 1.4;
	}
	.category {
		margin-top: 7px;
		border: 1px solid var(--border);
		border-radius: 5px;
		overflow: hidden;
	}
	.category-header {
		display: flex;
		align-items: stretch;
		min-width: 0;
	}
	.disclosure {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		gap: 9px;
		padding: 12px 10px;
		border: 0;
		background: transparent;
		color: var(--foreground);
		text-align: left;
		cursor: pointer;
	}
	.disclosure:hover {
		background: var(--muted);
	}
	.category-icon {
		display: grid;
		place-items: center;
		flex: 0 0 30px;
		width: 30px;
		height: 30px;
		background: var(--muted);
		border-radius: 3px;
	}
	.category-copy {
		display: grid;
		min-width: 0;
		flex: 1;
		gap: 3px;
	}
	.category-copy strong {
		font-size: 13px;
		font-weight: 600;
		line-height: 1.2;
	}
	.category-copy small {
		font-size: 11px;
		color: var(--muted-foreground);
		line-height: 1.3;
	}
	.selection-count {
		flex-shrink: 0;
		color: var(--muted-foreground);
		font:
			10px 'IBM Plex Mono',
			monospace;
	}
	:global(.rotated) {
		transform: rotate(180deg);
	}
	.site button :global(.rotated) {
		transform: rotate(90deg);
	}
	.all-toggle {
		display: grid;
		flex: 0 0 49px;
		place-items: center;
		border-left: 1px solid var(--border);
		cursor: pointer;
	}
	.all-toggle:hover {
		background: var(--muted);
	}
	.all-toggle.guide-active {
		outline: 2px solid var(--signal-deep);
		outline-offset: -3px;
		background: color-mix(in srgb, var(--signal) 16%, var(--card));
	}
	.all-toggle input,
	.script-row input {
		height: 20px;
		width: 20px;
		accent-color: var(--signal-deep);
		cursor: pointer;
	}
	.site-groups {
		border-top: 1px solid var(--border);
		padding: 0 10px 8px;
		background: color-mix(in srgb, var(--muted) 42%, var(--card));
	}
	.site {
		border-bottom: 1px solid var(--border);
	}
	.site:last-child {
		border-bottom: 0;
	}
	.site button {
		display: flex;
		gap: 8px;
		width: 100%;
		align-items: center;
		min-height: 38px;
		border: 0;
		color: var(--foreground);
		background: transparent;
		font-size: 12px;
		text-align: left;
		cursor: pointer;
	}
	.site button span {
		flex: 1;
	}
	.script-row {
		display: flex;
		align-items: center;
		gap: 10px;
		min-height: 45px;
		margin-left: 23px;
		padding: 6px 0 6px 10px;
		border-left: 2px solid var(--border);
		font-size: 12px;
		cursor: pointer;
	}
	.category-footnote {
		margin: 12px 2px 0;
		font-size: 11px;
		color: var(--muted-foreground);
		line-height: 1.4;
	}
	.preview {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 18px;
		background: var(--muted);
	}
	.preview-head {
		display: flex;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 6px;
		margin-bottom: 16px;
	}
	.preview-head strong {
		font:
			600 20px 'IBM Plex Sans Condensed',
			sans-serif;
	}
	.preview-head span {
		font:
			10px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
	}
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.mock-site {
		min-width: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 5px;
		background: var(--card);
	}
	.browser-bar {
		display: flex;
		align-items: center;
		gap: 3px;
		min-height: 27px;
		padding: 5px 7px;
		border-bottom: 1px solid var(--border);
	}
	.browser-bar > span {
		width: 5px;
		height: 5px;
		border-radius: 50%;
		background: var(--ash);
		opacity: 0.6;
	}
	.browser-bar strong {
		margin-left: 4px;
		overflow: hidden;
		font:
			9px 'IBM Plex Mono',
			monospace;
		color: var(--muted-foreground);
		text-overflow: ellipsis;
	}
	.mock-body {
		min-height: 178px;
		padding: 10px;
		transition: filter 200ms ease;
	}
	.mock-body.desaturated {
		filter: grayscale(1);
	}
	.mock-title {
		margin-bottom: 9px;
		font-size: 11px;
		font-weight: 600;
	}
	.mock-media {
		display: grid;
		min-height: 58px;
		place-items: center;
		border-radius: 3px;
		background: linear-gradient(135deg, #9db5a6, #ffbe72);
	}
	.mock-media.dimmed {
		opacity: 0.4;
	}
	.play-symbol {
		font-size: 17px;
		color: #25241f;
	}
	.mock-line {
		width: 100%;
		height: 5px;
		margin-top: 8px;
		border-radius: 2px;
		background: var(--border);
	}
	.mock-line.narrow {
		width: 65%;
	}
	.recommendations {
		margin-top: 12px;
		padding-top: 8px;
		border-top: 1px solid var(--border);
	}
	.recommendations strong {
		font-size: 10px;
	}
	.recommendations .mock-line {
		height: 4px;
	}
	.removed {
		margin-top: 11px;
		padding: 10px 5px;
		border: 1px dashed var(--border);
		font-size: 10px;
		text-align: center;
		color: var(--muted-foreground);
	}
	.simulation-banner {
		margin-top: 8px;
		padding: 6px;
		border-left: 2px solid var(--signal-deep);
		background: var(--card);
		color: var(--foreground);
		font-size: 10px;
	}
	.mock-verification {
		display: flex;
		align-items: center;
		gap: 6px;
		margin: 0 8px 8px;
		padding: 8px;
		border: 1px solid var(--signal-deep);
		font-size: 10px;
	}
	.preview-caption {
		margin-top: auto;
		padding: 9px;
		border-top: 1px solid var(--border);
		font:
			600 11px 'IBM Plex Mono',
			monospace;
	}
	.preview-disclaimer {
		margin-top: 14px;
		font-size: 11px;
		line-height: 1.5;
		color: var(--muted-foreground);
	}
	button:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--foreground);
		outline-offset: 2px;
	}
	.compact .group-intro p {
		display: none;
	}
	.compact .groups,
	.compact .preview {
		padding: 12px;
	}
	.compact .disclosure {
		padding: 9px 7px;
	}
	@media (max-width: 900px) {
		.demo-content {
			grid-template-columns: 1fr;
		}
		.groups {
			border-right: 0;
			border-bottom: 1px solid var(--border);
		}
	}
	@media (max-width: 410px) {
		.groups,
		.preview {
			padding: 11px;
		}
		.category-icon {
			display: none;
		}
		.all-toggle {
			flex-basis: 43px;
		}
		.mock-body {
			padding: 7px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.mock-body {
			transition: none;
		}
	}
</style>
