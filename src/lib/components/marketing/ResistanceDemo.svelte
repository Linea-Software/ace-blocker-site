<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
	import ResistanceSiteScene from './ResistanceSiteScene.svelte';

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
					id: 'reddit_block_recomandations',
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
	// Mirror catalog defaults: distraction removal starts on, disruption remains opt-in.
	const defaults = [
		'reddit_block_recomandations',
		'x_hide_trends',
		'youtube_shorts_remove',
		'netflix_disable_autoplay_previews'
	];
	const guidedDefaults = defaults.filter(
		(id) =>
			!sections
				.find((section) => section.kind === 'video')
				?.scripts.some((script) => script.id === id)
	);
	let selected = $state<string[]>([...defaults]);
	let openKind = $state<Kind | null>(null);
	let openSite = $state<string | null>(null);
	let host = $state<HTMLElement>();
	let demoReady = $state(false);
	onMount(() => {
		demoReady = true;
	});
	type PreviewSite = 'reddit.com' | 'youtube.com' | 'x.com' | 'netflix.com';
	let previewSite = $state<PreviewSite>('reddit.com');
	let previewView = $state<'before' | 'after'>('after');
	function showSite(site: string) {
		if (
			site === 'reddit.com' ||
			site === 'youtube.com' ||
			site === 'x.com' ||
			site === 'netflix.com'
		) {
			previewSite = site;
			previewView = 'after';
		}
	}
	function applyScript(step: number) {
		// Switching the preview website is its own pointer cue, before any
		// YouTube intervention is applied. This keeps the walkthrough legible.
		selected = [
			...(step >= 2 ? defaults : guidedDefaults),
			...(step >= 0 ? ['reddit_grayscale'] : []),
			...(step >= 2 ? ['youtube_low_quality'] : []),
			...(step >= 3 ? ['youtube_audio_delay'] : []),
			...(step >= 4 ? ['youtube_random_captcha'] : [])
		];
		showSite(step >= 1 ? 'youtube.com' : 'reddit.com');
		openKind = null;
		openSite = null;
	}
	const playback = new DemoPlayback(
		[
			{ target: 'visual', travelMs: 700 },
			{ target: 'preview-site', travelMs: 900, hoverMs: 300, pressMs: 180, settleMs: 800 },
			{ target: 'video', travelMs: 700 },
			{ target: 'interruptions', travelMs: 670 },
			{ target: 'captcha', travelMs: 680, settleMs: 760 },
			{
				target: 'captcha-checkbox',
				travelMs: 780,
				hoverMs: 330,
				pressMs: 200,
				settleMs: 3600
			}
		],
		applyScript,
		() => applyScript(-1)
	);
	const pointerTarget = $derived(playback.pointerTarget);
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
		const script = sections
			.flatMap((section) => section.scripts)
			.find((item) => item.id === id);
		if (script) showSite(script.site);
	}
</script>

<section
	class:compact
	class="resistance-demo"
	data-testid="resistance-demo"
	aria-label={m.demo_resistance_label()}
	data-demo-ready={demoReady}
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
							class:guide-active={(playback.phase === 'hover' ||
								playback.phase === 'press') &&
								pointerTarget === section.kind}
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
			<label class="preview-site">
				<span>{m.demo_preview_site()}</span>
				<select
					data-testid="resistance-preview-site"
					data-demo-target="preview-site"
					class:guide-active={(playback.phase === 'hover' ||
						playback.phase === 'press') &&
						pointerTarget === 'preview-site'}
					value={previewSite}
					onchange={(event) => {
						playback.manual();
						showSite(event.currentTarget.value);
					}}
				>
					<option value="reddit.com">reddit.com</option>
					<option value="youtube.com">youtube.com</option>
					<option value="x.com">x.com</option>
					<option value="netflix.com">netflix.com</option>
				</select>
			</label>
			<p class="preview-scope">{m.demo_preview_scope()}</p>
			<div class="view-switch" role="group" aria-label={m.demo_before_after()}>
				<button
					type="button"
					aria-pressed={previewView === 'before'}
					class:active={previewView === 'before'}
					onclick={() => {
						playback.manual();
						previewView = 'before';
					}}>{m.demo_before()}</button
				>
				<button
					type="button"
					aria-pressed={previewView === 'after'}
					class:active={previewView === 'after'}
					onclick={() => {
						playback.manual();
						previewView = 'after';
					}}>{m.demo_after()}</button
				>
			</div>
			<div
				class="preview-grid"
				class:scene-switched={playback.phase === 'settle' &&
					pointerTarget === 'preview-site'}
			>
				<div class="mock-site" class:mobile-hidden={previewView !== 'before'}>
					<div class="browser-bar">
						<span></span><span></span><span></span><strong>{previewSite}</strong>
					</div>
					{#key previewSite + selected.join(',')}
						<ResistanceSiteScene site={previewSite} after={false} {selected} />
					{/key}
					<div class="preview-caption">{m.demo_before()}</div>
				</div>
				<div class="mock-site after" class:mobile-hidden={previewView !== 'after'}>
					<div class="browser-bar">
						<span></span><span></span><span></span><strong>{previewSite}</strong>
					</div>
					{#key previewSite + selected.join(',')}
						<ResistanceSiteScene
							site={previewSite}
							after={true}
							{selected}
							autoVerify={playback.phase === 'settle' &&
								playback.step === 5 &&
								pointerTarget === 'captcha-checkbox'}
						/>
					{/key}
					<div class="preview-caption">{m.demo_after()}</div>
				</div>
			</div>
			<p class="preview-disclaimer">{m.demo_preview_disclaimer()}</p>
		</div>
	</div>
	{#if !compact}
		<WalkthroughControls {playback} />
		<DemoPointer
			root={host}
			target={pointerTarget}
			visible={playback.pointerVisible}
			phase={playback.phase}
			travelMs={playback.pointerTravelMs}
		/>
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
		margin-bottom: 10px;
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
	.preview-site {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		font-size: 11px;
		font-weight: 600;
	}
	.preview-site select {
		min-width: 0;
		max-width: 62%;
		min-height: 36px;
		padding: 5px 23px 5px 8px;
		border: 1px solid var(--border);
		border-radius: 3px;
		background: var(--card);
		color: var(--foreground);
		font:
			11px 'IBM Plex Mono',
			monospace;
		cursor: pointer;
	}
	.preview-site select.guide-active {
		outline: 2px solid var(--signal-deep);
		outline-offset: 2px;
		background: color-mix(in srgb, var(--signal) 12%, var(--card));
	}
	.preview-scope {
		margin: 8px 0 12px;
		font-size: 11px;
		line-height: 1.4;
		color: var(--muted-foreground);
	}
	.view-switch {
		display: none;
		gap: 0;
		margin-bottom: 10px;
		border: 1px solid var(--border);
		border-radius: 4px;
		overflow: hidden;
	}
	.view-switch button {
		flex: 1;
		min-height: 38px;
		border: 0;
		background: var(--card);
		color: var(--muted-foreground);
		font-size: 12px;
		font-weight: 600;
		cursor: pointer;
	}
	.view-switch button + button {
		border-left: 1px solid var(--border);
	}
	.view-switch button.active {
		background: var(--foreground);
		color: var(--background);
	}
	.preview-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
	}
	.scene-switched :global(.replica) {
		animation: preview-enter 360ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
	}
	@keyframes preview-enter {
		from {
			opacity: 0;
			transform: translateY(7px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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
	input:focus-visible,
	select:focus-visible {
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
	.compact .preview-grid {
		grid-template-columns: 1fr;
	}
	.compact .view-switch {
		display: flex;
	}
	.compact .preview-grid .mobile-hidden {
		display: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.scene-switched :global(.replica) {
			animation: none;
		}
	}
	@media (max-width: 1160px) {
		.preview-grid {
			grid-template-columns: 1fr;
		}
		.view-switch {
			display: flex;
		}
		.preview-grid .mobile-hidden {
			display: none;
		}
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
	@media (max-width: 540px) {
		.view-switch {
			display: flex;
		}
		.preview-grid {
			grid-template-columns: 1fr;
		}
		.preview-grid .mobile-hidden {
			display: none;
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
	}
</style>
