import { createEffect, createSignal, onSettled, For } from 'solid-js';
import {
	ChevronDown,
	ChevronRight,
	ListFilter,
	PlaySquare,
	Palette,
	Hourglass,
	ShieldQuestionMark,
	Globe
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { DemoPlayback } from './DemoPlayback';
import WalkthroughControls from './WalkthroughControls';
import DemoPointer from './DemoPointer';
import ResistanceSiteScene from './ResistanceSiteScene';
import styles from './ResistanceDemo.module.css';
const cls = (input: string) =>
	input
		.split(/\s+/)
		.map((token) => (styles[token] ? token + ' ' + styles[token] : token))
		.join(' ');
type Kind = 'feeds' | 'video' | 'visual' | 'interruptions' | 'captcha';
type Script = { id: string; site: string; title: () => string };
type Section = { kind: Kind; title: () => string; description: () => string; scripts: Script[] };
export default function ResistanceDemo(props: { compact?: boolean }) {
	const compact = () => props.compact ?? false;
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
	const defaults = [
		'reddit_block_recomandations',
		'x_hide_trends',
		'youtube_shorts_remove',
		'netflix_disable_autoplay_previews'
	];
	const guidedDefaults = defaults.filter(
		(id) =>
			!sections.find((section) => section.kind === 'video')?.scripts.some((s) => s.id === id)
	);
	const [selected, setSelected] = createSignal<string[]>([...defaults]);
	const [openKind, setOpenKind] = createSignal<Kind | null>(null);
	const [mobileControlsOpen, setMobileControlsOpen] = createSignal(() => !compact());
	const [openSite, setOpenSite] = createSignal<string | null>(null);
	const [host, setHost] = createSignal<HTMLElement>();
	const [demoReady, setDemoReady] = createSignal(false);
	type PreviewSite = 'reddit.com' | 'youtube.com' | 'x.com' | 'netflix.com';
	const [previewSite, setPreviewSite] = createSignal<PreviewSite>('reddit.com');
	const [previewView, setPreviewView] = createSignal<'before' | 'after'>('after');
	function showSite(site: string) {
		if (
			site === 'reddit.com' ||
			site === 'youtube.com' ||
			site === 'x.com' ||
			site === 'netflix.com'
		) {
			setPreviewSite(site);
			setPreviewView('after');
		}
	}
	function applyScript(step: number) {
		setSelected([
			...(step >= 2 ? defaults : guidedDefaults),
			...(step >= 0 ? ['reddit_grayscale'] : []),
			...(step >= 2 ? ['youtube_low_quality'] : []),
			...(step >= 3 ? ['youtube_audio_delay'] : []),
			...(step >= 4 ? ['youtube_random_captcha'] : [])
		]);
		showSite(step >= 1 ? 'youtube.com' : 'reddit.com');
		setOpenKind(null);
		setOpenSite(null);
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
	const pointerTarget = () => playback.pointerTarget;
	onSettled(() => {
		setDemoReady(true);
		return () => playback.dispose();
	});
	function toggleGroup(section: Section) {
		playback.manual();
		const all = section.scripts.every((script) => selected().includes(script.id));
		const ids = section.scripts.map((script) => script.id);
		setSelected(
			all
				? selected().filter((id) => !ids.includes(id))
				: [...new Set([...selected(), ...ids])]
		);
	}
	function toggleScript(id: string, checked: boolean) {
		playback.manual();
		setSelected(
			checked ? [...new Set([...selected(), id])] : selected().filter((item) => item !== id)
		);
		const script = sections
			.flatMap((section) => section.scripts)
			.find((item) => item.id === id);
		if (script) showSite(script.site);
	}
	const all = (section: Section) =>
		section.scripts.every((script) => selected().includes(script.id));
	const count = (section: Section) =>
		section.scripts.filter((script) => selected().includes(script.id)).length;
	const partial = (section: Section) => count(section) > 0 && !all(section);
	return (
		<div style={{ display: 'contents' }}>
			<section
				class={cls('resistance-demo') + (compact() ? ' ' + cls('compact') : '')}
				data-testid="resistance-demo"
				aria-label={m.demo_resistance_label()}
				data-demo-ready={demoReady() ? 'true' : 'false'}
				ref={setHost}
			>
				<div class={cls('demo-meta')}>
					<span>{m.demo_resistance_label()}</span>
					<span>{m.demo_simulation()}</span>
				</div>
				<div class={cls('demo-content')}>
					<div class={cls('groups')}>
						<button
							class={cls('mobile-groups-toggle')}
							type="button"
							aria-controls="resistance-interventions-panel"
							aria-expanded={mobileControlsOpen() ? 'true' : 'false'}
							onClick={() => {
								playback.manual();
								setMobileControlsOpen(!mobileControlsOpen());
							}}
						>
							<ListFilter size={17} aria-hidden="true" />
							<strong>{m.demo_interventions_heading()}</strong>
							<ChevronDown
								class={cls(mobileControlsOpen() ? 'rotated' : '')}
								size={17}
								aria-hidden="true"
							/>
						</button>
						<div
							class={
								cls('groups-body') +
								(mobileControlsOpen() ? ' ' + cls('expanded') : '')
							}
							id="resistance-interventions-panel"
						>
							<div class={cls('group-intro')}>
								<h3>{m.demo_interventions_heading()}</h3>
								<p>{m.demo_interventions_help()}</p>
							</div>
							<For each={sections}>
								{(section) => {
									let checkbox: HTMLInputElement | undefined;
									createEffect(
										() => partial(section),
										(value) => {
											if (checkbox) checkbox.indeterminate = value;
										}
									);
									return (
										<div style={{ display: 'contents' }}>
											<div
												class={cls('category')}
												data-testid={'category-' + section.kind}
											>
												<div class={cls('category-header')}>
													<button
														class={cls('disclosure')}
														type="button"
														aria-expanded={
															openKind() === section.kind
																? 'true'
																: 'false'
														}
														aria-controls={'demo-group-' + section.kind}
														onClick={() => {
															playback.manual();
															setOpenKind(
																openKind() === section.kind
																	? null
																	: section.kind
															);
															setOpenSite(null);
														}}
													>
														<span class={cls('category-icon')}>
															{section.kind === 'feeds' ? (
																<span
																	style={{ display: 'contents' }}
																>
																	<ListFilter
																		size={19}
																		aria-hidden="true"
																	/>
																</span>
															) : section.kind === 'video' ? (
																<span
																	style={{ display: 'contents' }}
																>
																	<PlaySquare
																		size={19}
																		aria-hidden="true"
																	/>
																</span>
															) : section.kind === 'visual' ? (
																<span
																	style={{ display: 'contents' }}
																>
																	<Palette
																		size={19}
																		aria-hidden="true"
																	/>
																</span>
															) : section.kind === 'interruptions' ? (
																<span
																	style={{ display: 'contents' }}
																>
																	<Hourglass
																		size={19}
																		aria-hidden="true"
																	/>
																</span>
															) : (
																<span
																	style={{ display: 'contents' }}
																>
																	<ShieldQuestionMark
																		size={19}
																		aria-hidden="true"
																	/>
																</span>
															)}
														</span>
														<span class={cls('category-copy')}>
															<strong>{section.title()}</strong>
															{!compact() ? (
																<span
																	style={{ display: 'contents' }}
																>
																	<small>
																		{section.description()}
																	</small>
																</span>
															) : null}
														</span>
														<span class={cls('selection-count')}>
															{count(section)}/
															{section.scripts.length}
														</span>
														<ChevronDown
															class={cls(
																openKind() === section.kind
																	? 'rotated'
																	: ''
															)}
															size={15}
															aria-hidden="true"
														/>
													</button>
													<label
														class={
															cls('all-toggle') +
															((playback.phase === 'hover' ||
																playback.phase === 'press') &&
															pointerTarget() === section.kind
																? ' ' + cls('guide-active')
																: '')
														}
														data-demo-target={section.kind}
														title={m.demo_select_category({
															category: section.title()
														})}
													>
														<input
															type="checkbox"
															checked={all(section)}
															ref={(el) => {
																checkbox = el;
															}}
															aria-label={m.demo_select_category({
																category: section.title()
															})}
															onChange={() => toggleGroup(section)}
														/>
													</label>
												</div>
												{openKind() === section.kind ? (
													<div style={{ display: 'contents' }}>
														<div
															class={cls('site-groups')}
															id={'demo-group-' + section.kind}
														>
															<For each={section.scripts}>
																{(script) => (
																	<div
																		style={{
																			display: 'contents'
																		}}
																	>
																		<div class={cls('site')}>
																			<button
																				type="button"
																				aria-expanded={
																					openSite() ===
																					script.id
																						? 'true'
																						: 'false'
																				}
																				onClick={() => {
																					playback.manual();
																					setOpenSite(
																						openSite() ===
																							script.id
																							? null
																							: script.id
																					);
																				}}
																			>
																				<Globe
																					size={15}
																					aria-hidden="true"
																				/>
																				<span>
																					{script.site}
																				</span>
																				<ChevronRight
																					class={cls(
																						openSite() ===
																							script.id
																							? 'rotated'
																							: ''
																					)}
																					size={15}
																					aria-hidden="true"
																				/>
																			</button>
																			{openSite() ===
																			script.id ? (
																				<span
																					style={{
																						display:
																							'contents'
																					}}
																				>
																					<label
																						class={cls(
																							'script-row'
																						)}
																					>
																						<input
																							type="checkbox"
																							checked={selected().includes(
																								script.id
																							)}
																							onChange={(
																								event
																							) =>
																								toggleScript(
																									script.id,
																									event
																										.currentTarget
																										.checked
																								)
																							}
																						/>
																						<span>
																							{script.title()}
																						</span>
																					</label>
																				</span>
																			) : null}
																		</div>
																	</div>
																)}
															</For>
														</div>
													</div>
												) : null}
											</div>
										</div>
									);
								}}
							</For>
							<p class={cls('category-footnote')}>{m.demo_captcha_default()}</p>
						</div>
					</div>
					<div class={cls('preview')}>
						<div class={cls('preview-head')}>
							<strong>{m.demo_before_after()}</strong>
							<span>{m.demo_fake_site()}</span>
						</div>
						<label class={cls('preview-site')}>
							<span>{m.demo_preview_site()}</span>
							<select
								class={
									'' +
									((playback.phase === 'hover' || playback.phase === 'press') &&
									pointerTarget() === 'preview-site'
										? ' ' + cls('guide-active')
										: '')
								}
								data-testid="resistance-preview-site"
								data-demo-target="preview-site"
								value={previewSite()}
								onChange={(event) => {
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
						<p class={cls('preview-scope')}>{m.demo_preview_scope()}</p>
						<div
							class={cls('view-switch')}
							role="group"
							aria-label={m.demo_before_after()}
						>
							<button
								class={'' + (previewView() === 'before' ? ' ' + cls('active') : '')}
								type="button"
								aria-pressed={previewView() === 'before' ? 'true' : 'false'}
								onClick={() => {
									playback.manual();
									setPreviewView('before');
								}}
							>
								{m.demo_before()}
							</button>
							<button
								class={'' + (previewView() === 'after' ? ' ' + cls('active') : '')}
								type="button"
								aria-pressed={previewView() === 'after' ? 'true' : 'false'}
								onClick={() => {
									playback.manual();
									setPreviewView('after');
								}}
							>
								{m.demo_after()}
							</button>
						</div>
						<div
							class={
								cls('preview-grid') +
								(playback.phase === 'settle' && pointerTarget() === 'preview-site'
									? ' ' + cls('scene-switched')
									: '')
							}
						>
							<div
								class={
									cls('mock-site') +
									(previewView() !== 'before' ? ' ' + cls('mobile-hidden') : '')
								}
							>
								<div class={cls('browser-bar')}>
									<span></span>
									<span></span>
									<span></span>
									<strong>{previewSite()}</strong>
								</div>
								<div style={{ display: 'contents' }}>
									<ResistanceSiteScene
										site={previewSite()}
										after={false}
										selected={selected()}
									/>
								</div>
								<div class={cls('preview-caption')}>{m.demo_before()}</div>
							</div>
							<div
								class={
									cls('mock-site after') +
									(previewView() !== 'after' ? ' ' + cls('mobile-hidden') : '')
								}
							>
								<div class={cls('browser-bar')}>
									<span></span>
									<span></span>
									<span></span>
									<strong>{previewSite()}</strong>
								</div>
								<div style={{ display: 'contents' }}>
									<ResistanceSiteScene
										site={previewSite()}
										after={true}
										selected={selected()}
										autoVerify={
											playback.phase === 'settle' &&
											playback.step === 5 &&
											pointerTarget() === 'captcha-checkbox'
										}
									/>
								</div>
								<div class={cls('preview-caption')}>{m.demo_after()}</div>
							</div>
						</div>
						<p class={cls('preview-disclaimer')}>{m.demo_preview_disclaimer()}</p>
					</div>
				</div>
				{!compact() ? (
					<div style={{ display: 'contents' }}>
						<WalkthroughControls
							playback={playback}
							onNavigate={() => setMobileControlsOpen(true)}
						/>
						<DemoPointer
							root={host()}
							target={pointerTarget()}
							visible={playback.pointerVisible}
							phase={playback.phase}
							travelMs={playback.pointerTravelMs}
						/>
					</div>
				) : null}
			</section>
		</div>
	);
}
