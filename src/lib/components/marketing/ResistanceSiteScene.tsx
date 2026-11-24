import { createSignal, createMemo, createEffect, onSettled, For } from 'solid-js';
function IconBrandReddit(props: { size?: number; stroke?: number }) {
	return (
		<svg
			width={props.size ?? 24}
			height={props.size ?? 24}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width={props.stroke ?? 2}
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 8c2.648 0 5.028 .826 6.675 2.14a2.5 2.5 0 0 1 2.326 4.36c0 3.59 -4.03 6.5 -9 6.5c-4.875 0 -8.845 -2.8 -9 -6.294l-1 -.206a2.5 2.5 0 0 1 2.326 -4.36c1.646 -1.313 4.026 -2.14 6.674 -2.14l.999 0" />
			<path d="M12 8l1 -5l6 1" />
			<circle cx="19" cy="4" r="1" />
			<circle cx="9" cy="13" r=".5" fill="currentColor" />
			<circle cx="15" cy="13" r=".5" fill="currentColor" />
			<path d="M10 17c.667 .333 1.333 .5 2 .5s1.333 -.167 2 -.5" />
		</svg>
	);
}
import {
	ArrowUp,
	Check,
	Heart,
	Home,
	LoaderCircle,
	MessageCircle,
	MoreHorizontal,
	Pause,
	Play,
	Search,
	Share2,
	ShieldCheck,
	ThumbsUp,
	Volume2,
	VolumeX
} from '@lucide/solid';
import styles from './ResistanceSiteScene.module.css';
const cls = (input: string) =>
	input
		.split(/\s+/)
		.map((token) => (styles[token] ? token + ' ' + styles[token] : token))
		.join(' ');
type Site = 'reddit.com' | 'youtube.com' | 'x.com' | 'netflix.com';
interface Props {
	site: Site;
	after: boolean;
	selected: string[];
	autoVerify?: boolean;
}

export default function ResistanceSiteScene(props: Props) {
	const active = (id: string) => props.after && props.selected.includes(id);
	const redditPosts = [
		{
			community: 'r/CozyPlaces',
			user: 'u/harborview',
			time: '2 hr. ago',
			title: 'Finally finished my little reading corner',
			score: '2.4k',
			comments: 146,
			art: 'room'
		},
		{
			community: 'r/technology',
			user: 'u/sparkline',
			time: '5 hr. ago',
			title: 'A weekend project that actually worked',
			score: '891',
			comments: 78,
			art: 'circuit'
		},
		{
			community: 'r/Outdoors',
			user: 'u/fernwalk',
			time: '8 hr. ago',
			title: 'A quiet trail just after sunrise',
			score: '6.1k',
			comments: 224,
			art: 'forest'
		},
		{
			community: 'r/CasualConversation',
			user: 'u/hellotoday',
			time: '11 hr. ago',
			title: 'What small thing made your day better?',
			score: '1.8k',
			comments: 342,
			art: 'sky'
		},
		{
			community: 'r/Design',
			user: 'u/slowstudio',
			time: '12 hr. ago',
			title: 'Three sketches from my notebook',
			score: '541',
			comments: 29,
			art: 'room'
		},
		{
			community: 'r/photography',
			user: 'u/themorninglight',
			time: '14 hr. ago',
			title: 'A photograph I almost did not take',
			score: '3.2k',
			comments: 108,
			art: 'forest'
		},
		{
			community: 'r/DIY',
			user: 'u/buildanother',
			time: '18 hr. ago',
			title: 'Made a little shelf from reclaimed wood',
			score: '786',
			comments: 53,
			art: 'circuit'
		}
	];
	const xPosts = [
		{
			user: 'Maya Chen',
			handle: '@mayamakes',
			time: '2h',
			text: 'A few frames from a lovely morning walk. The light was unreal.',
			art: 'forest',
			likes: '4.2K'
		},
		{
			user: 'Design Notes',
			handle: '@designnotes',
			time: '4h',
			text: 'Small details make a big difference. Here is what we have been building.',
			art: 'circuit',
			likes: '1,208'
		},
		{
			user: 'Sam Rivera',
			handle: '@samrivera',
			time: '6h',
			text: 'A reminder to take the scenic route every once in a while.',
			art: 'sky',
			likes: '863'
		}
	];
	const [atScrollLimit, setAtScrollLimit] = createSignal(false);
	const [isPlaying, setIsPlaying] = createSignal(false);
	const [audioReady, setAudioReady] = createSignal(true);
	const [checking, setChecking] = createSignal(false);
	const [checked, setChecked] = createSignal(false);
	const [verified, setVerified] = createSignal(false);
	let audioTimer: ReturnType<typeof setTimeout> | undefined;
	let captchaTimer: ReturnType<typeof setTimeout> | undefined;
	let finishTimer: ReturnType<typeof setTimeout> | undefined;
	const captchaVisible = createMemo(
		() =>
			props.after &&
			!verified() &&
			((props.site === 'reddit.com' && props.selected.includes('reddit_random_captcha')) ||
				(props.site === 'youtube.com' && props.selected.includes('youtube_random_captcha')))
	);
	function togglePlayback() {
		if (isPlaying()) {
			setIsPlaying(false);
			clearTimeout(audioTimer);
			return;
		}
		setIsPlaying(true);
		const ready = !active('youtube_audio_delay');
		setAudioReady(ready);
		clearTimeout(audioTimer);
		if (!ready) audioTimer = setTimeout(() => setAudioReady(true), 2000);
	}
	function handleScroll(event: Event) {
		if (!active('reddit_limit_scrolling') || props.site !== 'reddit.com') return;
		const viewport = event.currentTarget as HTMLDivElement;
		const limit = Math.min(
			viewport.clientHeight * 1.5,
			viewport.scrollHeight - viewport.clientHeight
		);
		if (viewport.scrollTop > limit) viewport.scrollTop = limit;
		setAtScrollLimit(viewport.scrollTop >= limit - 2);
	}
	function verify() {
		if (checking() || checked()) return;
		setChecking(true);
		captchaTimer = setTimeout(() => {
			setChecking(false);
			setChecked(true);
			finishTimer = setTimeout(() => setVerified(true), 850);
		}, 2400);
	}
	createEffect(
		() => ({ enabled: props.autoVerify ?? false, visible: captchaVisible() }),
		({ enabled, visible }) => {
			if (enabled && visible) verify();
		}
	);
	onSettled(() => () => {
		clearTimeout(audioTimer);
		clearTimeout(captchaTimer);
		clearTimeout(finishTimer);
	});
	return (
		<>
			<div
				class={
					cls('replica') +
					(props.site === 'reddit.com' ? ' ' + cls('reddit') : '') +
					(props.site === 'reddit.com' && active('reddit_grayscale')
						? ' ' + cls('grayscale-all')
						: '') +
					(props.site === 'youtube.com' ? ' ' + cls('youtube') : '') +
					(props.site === 'x.com' ? ' ' + cls('xsite') : '') +
					(props.site === 'netflix.com' ? ' ' + cls('netflix') : '')
				}
				data-testid="site-replica"
				data-site={props.site}
				data-after={props.after ? 'true' : 'false'}
			>
				{props.site === 'reddit.com' ? (
					<>
						<header class={cls('reddit-top')}>
							<span class={cls('reddit-logo')} aria-hidden="true">
								<IconBrandReddit size={19} stroke={2.4} />
							</span>
							<strong class={cls('reddit-word')}>reddit</strong>
							<span class={cls('reddit-search')}>
								<Search size={12} /> Search Reddit
							</span>
							<span class={cls('reddit-login')}>Log In</span>
						</header>
						<div class={cls('reddit-content')}>
							<div
								class={
									cls('scroll-viewport reddit-feed') +
									(atScrollLimit() ? ' ' + cls('at-limit') : '')
								}
								tabindex="0"
								role="region"
								aria-label="Scrollable Reddit demo feed"
								onScroll={handleScroll}
								data-testid="reddit-scroll-viewport"
								data-limited={active('reddit_limit_scrolling') ? 'true' : 'false'}
							>
								<div class={cls('reddit-tabs')}>
									<Home size={13} fill="currentColor" /> Popular <span>⌄</span>
									<span class={cls('reddit-sort')}>Best ⌄</span>
								</div>
								<For each={redditPosts}>
									{(post, i) => (
										<>
											<article class={cls('reddit-post')}>
												<div class={cls('post-byline')}>
													<span class={cls('community-avatar')}>
														{post.community.slice(2, 3).toUpperCase()}
													</span>
													<b>{post.community}</b>
													<span>· {post.time}</span>
													<MoreHorizontal size={13} />
												</div>
												<h4>{post.title}</h4>
												<div
													class={cls('post-art art-' + post.art)}
													aria-hidden="true"
												>
													<span class={cls('art-orb')}></span>
													<span class={cls('art-ground')}></span>
												</div>
												<div class={cls('reddit-reactions')}>
													<span>
														<ArrowUp size={12} /> {post.score}
													</span>
													<span>
														<MessageCircle size={12} /> {post.comments}
													</span>
													<span>
														<Share2 size={12} /> Share
													</span>
												</div>
											</article>
											{i() === 0 && !active('reddit_block_recomandations') ? (
												<>
													<aside
														class={cls('suggestions')}
														data-testid="reddit-suggestions"
													>
														<strong>Communities you might like</strong>
														<div>
															<span class={cls('suggest-avatar')}>
																✦
															</span>{' '}
															r/interestingasheck
															<span class={cls('join')}>Join</span>
														</div>
														<div>
															<span
																class={cls('suggest-avatar blue')}
															>
																◈
															</span>{' '}
															r/technology
															<span class={cls('join')}>Join</span>
														</div>
													</aside>
												</>
											) : null}
										</>
									)}
								</For>
							</div>
							{active('reddit_limit_scrolling') && atScrollLimit() ? (
								<>
									<div class={cls('scroll-edge')} aria-hidden="true"></div>
								</>
							) : null}
						</div>
					</>
				) : props.site === 'x.com' ? (
					<>
						<header class={cls('x-top')}>
							<span class={cls('x-logo')}>𝕏</span>
							<span class={cls('x-search')}>
								<Search size={13} /> Search
							</span>
							<span class={cls('x-avatar')}>M</span>
						</header>

						<div
							class={cls('scroll-viewport x-feed')}
							tabindex="0"
							role="region"
							aria-label="Scrollable X demo feed"
						>
							<div class={cls('x-tabs')}>
								<strong>For you</strong>
								<span>Following</span>
							</div>
							<div class={cls('x-compose')}>
								<span class={cls('x-user-circle')}>M</span>
								<span>What is happening?!</span>
								<span class={cls('x-post-button')}>Post</span>
							</div>
							<For each={xPosts}>
								{(post, i) => (
									<>
										<article class={cls('tweet')}>
											<div
												class={
													cls('x-user-circle') +
													(i() % 2 === 1 ? ' ' + cls('alternate') : '')
												}
											>
												{post.user.charAt(0)}
											</div>
											<div class={cls('tweet-copy')}>
												<div class={cls('tweet-author')}>
													<strong>{post.user}</strong>
													<span>
														{post.handle} · {post.time}
													</span>
													<MoreHorizontal size={13} />
												</div>
												<p>{post.text}</p>
												{post.art ? (
													<>
														<div
															class={cls('tweet-art art-' + post.art)}
															aria-hidden="true"
														>
															<span class={cls('art-orb')}></span>
															<span class={cls('art-ground')}></span>
														</div>
													</>
												) : null}
												<div class={cls('tweet-reactions')}>
													<span>
														<MessageCircle size={12} /> 48
													</span>
													<span>⇄ 201</span>
													<span>
														<Heart size={12} /> {post.likes}
													</span>
													<Share2 size={12} />
												</div>
											</div>
										</article>
										{i() === 0 && !active('x_hide_trends') ? (
											<>
												<aside
													class={cls('x-trends')}
													data-testid="x-trends"
												>
													<strong>What’s happening</strong>
													<div>
														Trending in Technology{' '}
														<b>Creative coding</b> 12.6K posts
													</div>
													<div>
														Trending today <b>Morning routines</b> 8,405
														posts
													</div>
												</aside>
											</>
										) : null}
									</>
								)}
							</For>
						</div>
					</>
				) : props.site === 'youtube.com' ? (
					<>
						<header class={cls('youtube-top')}>
							<span class={cls('youtube-menu')}>☰</span>
							<span class={cls('yt-mark')} aria-hidden="true">
								▶
							</span>
							<b>YouTube</b>
							<span class={cls('yt-search')}>
								<Search size={12} /> Search
							</span>
							<span class={cls('yt-profile')}>J</span>
						</header>

						<div
							class={cls('scroll-viewport yt-content')}
							tabindex="0"
							role="region"
							aria-label="YouTube demo page"
						>
							<div class={cls('yt-chips')}>
								<span>All</span>
								<span>Music</span>
								<span>Gaming</span>
								<span>Recently uploaded</span>
							</div>
							<div class={cls('yt-player')}>
								<button
									class={
										cls('yt-poster') +
										(isPlaying() ? ' ' + cls('playing') : '') +
										(active('youtube_low_quality')
											? ' ' + cls('pixelated')
											: '')
									}
									type="button"
									data-testid="youtube-video"
									data-quality={active('youtube_low_quality') ? 'low' : 'normal'}
									onClick={togglePlayback}
									aria-label={
										isPlaying() ? 'Pause demo video' : 'Play demo video'
									}
								>
									<div class={cls('yt-visual')}>
										<div class={cls('yt-sun')}></div>
										<div class={cls('yt-mountain')}></div>
										<div class={cls('yt-mountain second')}></div>
										<div class={cls('yt-road')}></div>
									</div>
									{!isPlaying() ? (
										<>
											<span class={cls('yt-play-icon')}>
												<Play size={21} fill="white" />
											</span>
										</>
									) : null}
									<span class={cls('yt-controls')}>
										<span>
											{isPlaying() ? (
												<>
													<Pause size={12} fill="white" />
												</>
											) : (
												<>
													<Play size={12} fill="white" />
												</>
											)}
										</span>
										<span class={cls('yt-time')}>
											{isPlaying() ? '0:07' : '0:00'} / 8:24
										</span>
										{isPlaying() ? (
											<>
												<span
													class={cls('yt-audio')}
													data-testid="youtube-audio"
													data-ready={audioReady() ? 'true' : 'false'}
													aria-label={
														audioReady()
															? 'Audio synchronized'
															: 'Audio delayed while the video plays'
													}
												>
													{audioReady() ? (
														<>
															<Volume2 size={14} />
														</>
													) : (
														<>
															<LoaderCircle
																class={cls('spinning')}
																size={14}
															/>
															<span class={cls('audio-wait')}>
																Audio…
															</span>
														</>
													)}
												</span>
											</>
										) : (
											<>
												<VolumeX size={13} />
											</>
										)}
									</span>
									<span
										class={
											cls('yt-progress') +
											(isPlaying() ? ' ' + cls('running') : '')
										}
									>
										<i></i>
									</span>
								</button>
								<h4>A peaceful ride through the mountains | 4K travel film</h4>
								<div class={cls('yt-video-info')}>
									<span class={cls('yt-channel-avatar')}>N</span>
									<span>
										<b>Northbound Films</b>
										<small>214K subscribers</small>
									</span>
									<span class={cls('yt-subscribe')}>Subscribe</span>
								</div>
								<div class={cls('yt-actions')}>
									<span>
										<ThumbsUp size={12} /> 12K
									</span>
									<span>
										<Share2 size={12} /> Share
									</span>
									<span>⋯</span>
								</div>
							</div>
							{!active('youtube_shorts_remove') ? (
								<>
									<div class={cls('shorts-section')} data-testid="youtube-shorts">
										<h5>
											<span class={cls('shorts-glyph')}>▶</span> Shorts
										</h5>
										<div class={cls('shorts-row')}>
											<div class={cls('short-card card-one')}>
												<span>Weekend escape</span>
											</div>
											<div class={cls('short-card card-two')}>
												<span>Easy recipes</span>
											</div>
											<div class={cls('short-card card-three')}>
												<span>Studio tour</span>
											</div>
										</div>
									</div>
								</>
							) : null}
							<div class={cls('yt-next')}>
								<h5>Up next</h5>
								<div class={cls('next-video')}>
									<div class={cls('next-thumb')}></div>
									<div>
										<b>Little moments from a long weekend</b>
										<small>Outside Journal · 32K views</small>
									</div>
								</div>
								<div class={cls('next-video')}>
									<div class={cls('next-thumb alt')}></div>
									<div>
										<b>Making things with your hands</b>
										<small>Studio No. 4 · 118K views</small>
									</div>
								</div>
							</div>
						</div>
					</>
				) : (
					<>
						<header class={cls('netflix-top')}>
							<strong>NETFLIX</strong>
							<span>Home</span>
							<span>Series</span>
							<span>Films</span>
							<span class={cls('nfx-profile')}>K</span>
						</header>

						<div
							class={cls('scroll-viewport netflix-content')}
							tabindex="0"
							role="region"
							aria-label="Netflix demo page"
						>
							<div
								class={
									cls('nfx-hero') +
									(!active('netflix_disable_autoplay_previews')
										? ' ' + cls('motion')
										: '')
								}
							>
								<div class={cls('nfx-sun')}></div>
								<div class={cls('nfx-city')}></div>
								<div class={cls('nfx-hero-copy')}>
									<small>
										N <b>SERIES</b>
									</small>
									<h4>
										THE LAST
										<br />
										HORIZON
									</h4>
									<p>A new journey begins.</p>
									<span class={cls('nfx-buttons')}>
										<span>
											<Play size={10} fill="currentColor" /> Play
										</span>
										<span>ⓘ More Info</span>
									</span>
								</div>
								{active('netflix_disable_autoplay_previews') ? (
									<>
										<span
											class={cls('nfx-paused')}
											data-testid="netflix-preview-paused"
										>
											<Pause size={13} />
										</span>
									</>
								) : (
									<>
										<span
											class={cls('nfx-live')}
											data-testid="netflix-preview-playing"
										>
											<span></span> Preview
										</span>
									</>
								)}
							</div>
							<div class={cls('nfx-shelf')}>
								<h5>Trending Now</h5>
								<div class={cls('nfx-covers')}>
									<div class={cls('nfx-cover cover-one')}>
										FAR
										<br />
										AWAY
									</div>
									<div class={cls('nfx-cover cover-two')}>
										THE
										<br />
										SIGNAL
									</div>
									<div class={cls('nfx-cover cover-three')}>
										WILD
										<br />
										NORTH
									</div>
								</div>
							</div>
							<div class={cls('nfx-shelf')}>
								<h5>Continue Watching</h5>
								<div class={cls('nfx-covers')}>
									<div class={cls('nfx-cover cover-four')}>
										NIGHT
										<br />
										FALL
									</div>
									<div class={cls('nfx-cover cover-one')}>
										FAR
										<br />
										AWAY
									</div>
								</div>
							</div>
						</div>
					</>
				)}

				{captchaVisible() ? (
					<>
						<div
							class={cls('captcha-screen')}
							data-testid="mock-captcha"
							role="dialog"
							aria-modal="true"
							aria-label="Security check"
						>
							<p>Please confirm you are not a robot to continue.</p>
							<div class={cls('captcha-widget')}>
								<button
									class={cls('captcha-check')}
									type="button"
									onClick={verify}
									disabled={checking() || checked()}
									aria-label="I'm not a robot"
									data-testid="captcha-checkbox"
									data-demo-target="captcha-checkbox"
									data-state={
										checking() ? 'checking' : checked() ? 'checked' : 'idle'
									}
								>
									{checking() ? (
										<>
											<span
												class={cls('captcha-spinner')}
												data-testid="captcha-spinner"
												role="status"
												aria-label="Verifying"
											></span>
										</>
									) : checked() ? (
										<>
											<Check size={24} strokeWidth={3} />
										</>
									) : (
										<>
											<span class={cls('captcha-empty')}></span>
										</>
									)}
								</button>
								<span>I'm not a robot</span>
								<span class={cls('captcha-brand')}>
									<ShieldCheck size={21} />
									<small>Security</small>
								</span>
							</div>
						</div>
					</>
				) : null}
			</div>
		</>
	);
}
