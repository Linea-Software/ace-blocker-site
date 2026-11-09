<script lang="ts">
	import { onDestroy } from 'svelte';
	import { IconBrandReddit } from '@tabler/icons-svelte';
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
	} from '@lucide/svelte';

	type Site = 'reddit.com' | 'youtube.com' | 'x.com' | 'netflix.com';
	let {
		site,
		after,
		selected,
		autoVerify = false
	}: { site: Site; after: boolean; selected: string[]; autoVerify?: boolean } = $props();

	const active = (id: string) => after && selected.includes(id);
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

	let atScrollLimit = $state(false);
	let isPlaying = $state(false);
	let audioReady = $state(true);
	let checking = $state(false);
	let checked = $state(false);
	let verified = $state(false);
	let audioTimer: ReturnType<typeof setTimeout> | undefined;
	let captchaTimer: ReturnType<typeof setTimeout> | undefined;
	let finishTimer: ReturnType<typeof setTimeout> | undefined;
	const captchaVisible = $derived(
		after &&
			!verified &&
			((site === 'reddit.com' && selected.includes('reddit_random_captcha')) ||
				(site === 'youtube.com' && selected.includes('youtube_random_captcha')))
	);

	function togglePlayback() {
		if (isPlaying) {
			isPlaying = false;
			clearTimeout(audioTimer);
			return;
		}
		isPlaying = true;
		audioReady = !active('youtube_audio_delay');
		clearTimeout(audioTimer);
		if (!audioReady)
			audioTimer = setTimeout(() => {
				audioReady = true;
			}, 2000);
	}

	function handleScroll(event: Event) {
		if (!active('reddit_limit_scrolling') || site !== 'reddit.com') return;
		const viewport = event.currentTarget as HTMLDivElement;
		// The actual script caps the page at 1.5 viewport heights of travel.
		const limit = Math.min(
			viewport.clientHeight * 1.5,
			viewport.scrollHeight - viewport.clientHeight
		);
		if (viewport.scrollTop > limit) viewport.scrollTop = limit;
		atScrollLimit = viewport.scrollTop >= limit - 2;
	}

	function verify() {
		if (checking || checked) return;
		checking = true;
		captchaTimer = setTimeout(() => {
			checking = false;
			checked = true;
			finishTimer = setTimeout(() => {
				verified = true;
			}, 850);
		}, 2400);
	}
	$effect(() => {
		if (autoVerify && captchaVisible) verify();
	});
	onDestroy(() => {
		clearTimeout(audioTimer);
		clearTimeout(captchaTimer);
		clearTimeout(finishTimer);
	});
</script>

<!-- Deliberately isolated visual language: the sites should not inherit Ace styling. -->
<div
	class="replica"
	class:reddit={site === 'reddit.com'}
	class:grayscale-all={site === 'reddit.com' && active('reddit_grayscale')}
	class:youtube={site === 'youtube.com'}
	class:xsite={site === 'x.com'}
	class:netflix={site === 'netflix.com'}
	data-testid="site-replica"
	data-site={site}
	data-after={after}
>
	{#if site === 'reddit.com'}
		<header class="reddit-top">
			<span class="reddit-logo" aria-hidden="true"
				><IconBrandReddit size={19} stroke={2.4} /></span
			><strong class="reddit-word">reddit</strong>
			<span class="reddit-search"><Search size={12} /> Search Reddit</span>
			<span class="reddit-login">Log In</span>
		</header>
		<div class="reddit-content">
			<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
			<div
				class="scroll-viewport reddit-feed"
				tabindex="0"
				role="region"
				aria-label="Scrollable Reddit demo feed"
				onscroll={handleScroll}
				data-testid="reddit-scroll-viewport"
				data-limited={active('reddit_limit_scrolling')}
				class:at-limit={atScrollLimit}
			>
				<div class="reddit-tabs">
					<Home size={13} fill="currentColor" /> Popular <span>⌄</span><span
						class="reddit-sort">Best ⌄</span
					>
				</div>
				{#each redditPosts as post, i (post.community)}
					<article class="reddit-post">
						<div class="post-byline">
							<span class="community-avatar"
								>{post.community.slice(2, 3).toUpperCase()}</span
							><b>{post.community}</b><span>· {post.time}</span><MoreHorizontal
								size={13}
							/>
						</div>
						<h4>{post.title}</h4>
						<div class={'post-art art-' + post.art} aria-hidden="true">
							<span class="art-orb"></span><span class="art-ground"></span>
						</div>
						<div class="reddit-reactions">
							<span><ArrowUp size={12} /> {post.score}</span><span
								><MessageCircle size={12} /> {post.comments}</span
							><span><Share2 size={12} /> Share</span>
						</div>
					</article>
					{#if i === 0 && !active('reddit_block_recomandations')}
						<aside class="suggestions" data-testid="reddit-suggestions">
							<strong>Communities you might like</strong>
							<div>
								<span class="suggest-avatar">✦</span> r/interestingasheck
								<span class="join">Join</span>
							</div>
							<div>
								<span class="suggest-avatar blue">◈</span> r/technology
								<span class="join">Join</span>
							</div>
						</aside>
					{/if}
				{/each}
			</div>
			{#if active('reddit_limit_scrolling') && atScrollLimit}
				<div class="scroll-edge" aria-hidden="true"></div>
			{/if}
		</div>
	{:else if site === 'x.com'}
		<header class="x-top">
			<span class="x-logo">𝕏</span><span class="x-search"><Search size={13} /> Search</span
			><span class="x-avatar">M</span>
		</header>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="scroll-viewport x-feed"
			tabindex="0"
			role="region"
			aria-label="Scrollable X demo feed"
		>
			<div class="x-tabs"><strong>For you</strong><span>Following</span></div>
			<div class="x-compose">
				<span class="x-user-circle">M</span><span>What is happening?!</span><span
					class="x-post-button">Post</span
				>
			</div>
			{#each xPosts as post, i (post.handle)}
				<article class="tweet">
					<div class="x-user-circle" class:alternate={i % 2 === 1}>
						{post.user.charAt(0)}
					</div>
					<div class="tweet-copy">
						<div class="tweet-author">
							<strong>{post.user}</strong><span>{post.handle} · {post.time}</span
							><MoreHorizontal size={13} />
						</div>
						<p>{post.text}</p>
						{#if post.art}<div class={'tweet-art art-' + post.art} aria-hidden="true">
								<span class="art-orb"></span><span class="art-ground"></span>
							</div>{/if}
						<div class="tweet-reactions">
							<span><MessageCircle size={12} /> 48</span><span>⇄ 201</span><span
								><Heart size={12} /> {post.likes}</span
							><Share2 size={12} />
						</div>
					</div>
				</article>
				{#if i === 0 && !active('x_hide_trends')}
					<aside class="x-trends" data-testid="x-trends">
						<strong>What’s happening</strong>
						<div>Trending in Technology <b>Creative coding</b> 12.6K posts</div>
						<div>Trending today <b>Morning routines</b> 8,405 posts</div>
					</aside>
				{/if}
			{/each}
		</div>
	{:else if site === 'youtube.com'}
		<header class="youtube-top">
			<span class="youtube-menu">☰</span><span class="yt-mark" aria-hidden="true">▶</span><b
				>YouTube</b
			><span class="yt-search"><Search size={12} /> Search</span><span class="yt-profile"
				>J</span
			>
		</header>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="scroll-viewport yt-content"
			tabindex="0"
			role="region"
			aria-label="YouTube demo page"
		>
			<div class="yt-chips">
				<span>All</span><span>Music</span><span>Gaming</span><span>Recently uploaded</span>
			</div>
			<div class="yt-player">
				<button
					type="button"
					class="yt-poster"
					class:playing={isPlaying}
					class:pixelated={active('youtube_low_quality')}
					data-testid="youtube-video"
					data-quality={active('youtube_low_quality') ? 'low' : 'normal'}
					onclick={togglePlayback}
					aria-label={isPlaying ? 'Pause demo video' : 'Play demo video'}
				>
					<div class="yt-visual">
						<div class="yt-sun"></div>
						<div class="yt-mountain"></div>
						<div class="yt-mountain second"></div>
						<div class="yt-road"></div>
					</div>
					{#if !isPlaying}<span class="yt-play-icon"><Play size={21} fill="white" /></span
						>{/if}
					<span class="yt-controls"
						><span
							>{#if isPlaying}<Pause size={12} fill="white" />{:else}<Play
									size={12}
									fill="white"
								/>{/if}</span
						><span class="yt-time">{isPlaying ? '0:07' : '0:00'} / 8:24</span>
						{#if isPlaying}
							<span
								class="yt-audio"
								data-testid="youtube-audio"
								data-ready={audioReady}
								aria-label={audioReady
									? 'Audio synchronized'
									: 'Audio delayed while the video plays'}
							>
								{#if audioReady}<Volume2 size={14} />{:else}<LoaderCircle
										size={14}
										class="spinning"
									/><span class="audio-wait">Audio…</span>{/if}
							</span>
						{:else}<VolumeX size={13} />{/if}
					</span>
					<span class="yt-progress" class:running={isPlaying}><i></i></span>
				</button>
				<h4>A peaceful ride through the mountains | 4K travel film</h4>
				<div class="yt-video-info">
					<span class="yt-channel-avatar">N</span><span
						><b>Northbound Films</b><small>214K subscribers</small></span
					><span class="yt-subscribe">Subscribe</span>
				</div>
				<div class="yt-actions">
					<span><ThumbsUp size={12} /> 12K</span><span><Share2 size={12} /> Share</span
					><span>⋯</span>
				</div>
			</div>
			{#if !active('youtube_shorts_remove')}
				<div class="shorts-section" data-testid="youtube-shorts">
					<h5><span class="shorts-glyph">▶</span> Shorts</h5>
					<div class="shorts-row">
						<div class="short-card card-one"><span>Weekend escape</span></div>
						<div class="short-card card-two"><span>Easy recipes</span></div>
						<div class="short-card card-three"><span>Studio tour</span></div>
					</div>
				</div>
			{/if}
			<div class="yt-next">
				<h5>Up next</h5>
				<div class="next-video">
					<div class="next-thumb"></div>
					<div>
						<b>Little moments from a long weekend</b><small
							>Outside Journal · 32K views</small
						>
					</div>
				</div>
				<div class="next-video">
					<div class="next-thumb alt"></div>
					<div>
						<b>Making things with your hands</b><small>Studio No. 4 · 118K views</small>
					</div>
				</div>
			</div>
		</div>
	{:else}
		<header class="netflix-top">
			<strong>NETFLIX</strong><span>Home</span><span>Series</span><span>Films</span><span
				class="nfx-profile">K</span
			>
		</header>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			class="scroll-viewport netflix-content"
			tabindex="0"
			role="region"
			aria-label="Netflix demo page"
		>
			<div class="nfx-hero" class:motion={!active('netflix_disable_autoplay_previews')}>
				<div class="nfx-sun"></div>
				<div class="nfx-city"></div>
				<div class="nfx-hero-copy">
					<small>N <b>SERIES</b></small>
					<h4>THE LAST<br />HORIZON</h4>
					<p>A new journey begins.</p>
					<span class="nfx-buttons"
						><span><Play size={10} fill="currentColor" /> Play</span><span
							>ⓘ More Info</span
						></span
					>
				</div>
				{#if active('netflix_disable_autoplay_previews')}<span
						class="nfx-paused"
						data-testid="netflix-preview-paused"
						><Pause size={13} />
					</span>{:else}<span class="nfx-live" data-testid="netflix-preview-playing"
						><span></span> Preview</span
					>{/if}
			</div>
			<div class="nfx-shelf">
				<h5>Trending Now</h5>
				<div class="nfx-covers">
					<div class="nfx-cover cover-one">FAR<br />AWAY</div>
					<div class="nfx-cover cover-two">THE<br />SIGNAL</div>
					<div class="nfx-cover cover-three">WILD<br />NORTH</div>
				</div>
			</div>
			<div class="nfx-shelf">
				<h5>Continue Watching</h5>
				<div class="nfx-covers">
					<div class="nfx-cover cover-four">NIGHT<br />FALL</div>
					<div class="nfx-cover cover-one">FAR<br />AWAY</div>
				</div>
			</div>
		</div>
	{/if}

	{#if captchaVisible}
		<div
			class="captcha-screen"
			data-testid="mock-captcha"
			role="dialog"
			aria-modal="true"
			aria-label="Security check"
		>
			<p>Please confirm you are not a robot to continue.</p>
			<div class="captcha-widget">
				<button
					type="button"
					class="captcha-check"
					onclick={verify}
					disabled={checking || checked}
					aria-label="I'm not a robot"
					data-testid="captcha-checkbox"
					data-demo-target="captcha-checkbox"
					data-state={checking ? 'checking' : checked ? 'checked' : 'idle'}
				>
					{#if checking}<span
							class="captcha-spinner"
							data-testid="captcha-spinner"
							role="status"
							aria-label="Verifying"
						></span>
					{:else if checked}<Check size={24} strokeWidth={3} />
					{:else}<span class="captcha-empty"></span>{/if}
				</button>
				<span>I'm not a robot</span>
				<span class="captcha-brand"><ShieldCheck size={21} /><small>Security</small></span>
			</div>
		</div>
	{/if}
</div>

<style>
	/* The replica palette and typography are local, independent of Ace Blocker's theme. */
	.replica {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 315px;
		width: 100%;
		overflow: hidden;
		background: #fff;
		color: #161616;
		font-family: Arial, Helvetica, sans-serif;
		font-size: 11px;
		line-height: 1.4;
		isolation: isolate;
	}
	.replica * {
		box-sizing: border-box;
	}
	.replica button {
		font-family: inherit;
		cursor: pointer;
	}
	.replica button:focus-visible,
	.scroll-viewport:focus-visible {
		outline: 2px solid #2275d4;
		outline-offset: -3px;
	}
	.scroll-viewport {
		overflow-y: auto;
		overscroll-behavior: contain;
		scrollbar-width: thin;
		scrollbar-color: #aaa6 transparent;
		flex: 1;
		min-height: 0;
	}
	header {
		flex: 0 0 auto;
	}
	/* Reddit — off-white feed, orange identity, compact cards and vote controls. */
	.reddit {
		background: #dae0e6;
		color: #1c1c1c;
	}
	.reddit-top {
		display: flex;
		align-items: center;
		gap: 5px;
		height: 38px;
		padding: 0 9px;
		background: #fff;
		border-bottom: 1px solid #ddd;
	}
	.reddit-logo {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #ff4500;
		color: white;
		font-size: 17px;
		line-height: 1;
	}
	.reddit-word {
		font-size: 15px;
		letter-spacing: -0.7px;
		color: #ff4500;
	}
	.reddit-search {
		display: flex;
		flex: 1;
		min-width: 0;
		align-items: center;
		gap: 4px;
		overflow: hidden;
		white-space: nowrap;
		margin-left: 7px;
		padding: 5px 6px;
		background: #f6f7f8;
		color: #878a8c;
		border: 1px solid #edeff1;
		border-radius: 16px;
		font-size: 9px;
	}
	.reddit-login {
		padding: 5px 9px;
		border-radius: 20px;
		background: #d93a00;
		color: white;
		white-space: nowrap;
		font-weight: 700;
		font-size: 9px;
	}
	.reddit-content {
		display: flex;
		position: relative;
		flex: 1;
		min-height: 0;
	}
	/* Reddit grayscale affects the entire page, including its chrome and controls. */
	.replica.grayscale-all {
		filter: grayscale(1);
	}
	.reddit-feed {
		width: 100%;
		padding: 7px;
	}
	.reddit-tabs {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-bottom: 5px;
		padding: 7px 8px;
		border-radius: 4px;
		background: #fff;
		color: #0079d3;
		font-weight: 700;
	}
	.reddit-tabs span:nth-child(2) {
		color: #818384;
	}
	.reddit-tabs .reddit-sort {
		margin-left: auto;
		color: #818384;
		font-weight: 400;
	}
	.reddit-post {
		margin-bottom: 7px;
		padding: 9px 9px 7px;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
	}
	.post-byline {
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		white-space: nowrap;
		font-size: 9px;
		color: #787c7e;
	}
	.post-byline b {
		overflow: hidden;
		color: #202020;
		text-overflow: ellipsis;
	}
	.post-byline :global(svg) {
		margin-left: auto;
		flex-shrink: 0;
	}
	.community-avatar {
		display: grid;
		place-items: center;
		width: 17px;
		height: 17px;
		border-radius: 50%;
		background: #3a7d9f;
		color: white;
		font-weight: 700;
	}
	.reddit-post h4 {
		margin: 7px 0 8px;
		font-size: 11px;
		font-weight: 700;
		line-height: 1.3;
	}
	.post-art,
	.tweet-art {
		position: relative;
		display: block;
		overflow: hidden;
		height: 66px;
		border-radius: 3px;
	}
	.art-room {
		background: linear-gradient(135deg, #c49872 0%, #e4d0af 48%, #607a70 100%);
	}
	.art-circuit {
		background: linear-gradient(140deg, #182c47, #446b7c 57%, #a5b5a4);
	}
	.art-forest {
		background: linear-gradient(150deg, #a1bfc3, #527c69 47%, #193e33);
	}
	.art-sky {
		background: linear-gradient(160deg, #e8bd8b, #8ba7b4 48%, #384d72);
	}
	.art-orb {
		position: absolute;
		top: 10px;
		right: 20%;
		height: 30px;
		width: 30px;
		border-radius: 50%;
		background: #fff6;
		box-shadow: 0 0 22px #fff5;
	}
	.art-ground {
		position: absolute;
		bottom: -18px;
		left: -10%;
		width: 120%;
		height: 44px;
		transform: rotate(-8deg);
		background: #182f3b7a;
		border-radius: 45% 70% 0 0;
	}
	.reddit-reactions {
		display: flex;
		gap: 9px;
		padding-top: 8px;
		color: #6a6f73;
		font-size: 9px;
		font-weight: 700;
	}
	.reddit-reactions span {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.suggestions {
		margin: 6px 0;
		padding: 10px;
		background: white;
		border: 1px solid #ced1d3;
		border-radius: 4px;
		font-size: 10px;
	}
	.suggestions strong {
		display: block;
		margin-bottom: 7px;
	}
	.suggestions div {
		display: flex;
		align-items: center;
		gap: 7px;
		padding: 5px 0;
		border-top: 1px solid #edeff1;
	}
	.suggest-avatar {
		display: grid;
		place-items: center;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: #ff9f39;
		color: white;
	}
	.suggest-avatar.blue {
		background: #459ad2;
	}
	.join {
		margin-left: auto;
		color: #0079d3;
		font-weight: 700;
	}
	.scroll-edge {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 7px;
		pointer-events: none;
		background: linear-gradient(transparent, #ff4500a0);
	}
	/* X — dark timeline with posts and trending block. */
	.xsite {
		background: #000;
		color: #e7e9ea;
	}
	.x-top {
		display: flex;
		align-items: center;
		gap: 12px;
		height: 38px;
		padding: 0 13px;
		border-bottom: 1px solid #303639;
	}
	.x-logo {
		font-size: 23px;
		font-weight: 500;
		line-height: 1;
	}
	.x-search {
		display: flex;
		align-items: center;
		gap: 7px;
		flex: 1;
		padding: 6px 10px;
		border-radius: 40px;
		background: #202327;
		color: #72767a;
	}
	.x-avatar,
	.x-user-circle {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: #6e85a6;
		color: white;
		flex-shrink: 0;
		font-weight: 700;
	}
	.x-tabs {
		display: flex;
		justify-content: space-around;
		align-items: center;
		height: 33px;
		border-bottom: 1px solid #2f3336;
		color: #777d82;
	}
	.x-tabs strong {
		height: 100%;
		display: grid;
		place-items: center;
		border-bottom: 3px solid #1d9bf0;
		color: #f0f0f0;
	}
	.x-compose {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 9px 12px;
		border-bottom: 1px solid #2f3336;
		color: #72767a;
	}
	.x-compose .x-post-button {
		margin-left: auto;
		padding: 5px 10px;
		color: white;
		border-radius: 20px;
		background: #1d9bf0;
		font-weight: 700;
	}
	.tweet {
		display: flex;
		gap: 7px;
		padding: 11px 10px 7px;
		border-bottom: 1px solid #2f3336;
	}
	.x-user-circle.alternate {
		background: #976685;
	}
	.tweet-copy {
		flex: 1;
		min-width: 0;
	}
	.tweet-author {
		display: flex;
		gap: 4px;
		align-items: center;
		overflow: hidden;
		white-space: nowrap;
	}
	.tweet-author strong {
		flex-shrink: 0;
		font-size: 10px;
	}
	.tweet-author span {
		color: #71767b;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 9px;
	}
	.tweet-author :global(svg) {
		margin-left: auto;
		flex-shrink: 0;
		color: #71767b;
	}
	.tweet p {
		margin: 4px 0 8px;
		color: #eee;
		font-size: 10px;
	}
	.tweet-art {
		height: 70px;
		border: 1px solid #343c40;
		border-radius: 9px;
	}
	.tweet-reactions {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 5px;
		padding-top: 9px;
		font-size: 9px;
		color: #71767b;
	}
	.tweet-reactions span {
		display: flex;
		align-items: center;
		gap: 3px;
	}
	.x-trends {
		margin: 8px;
		padding: 9px 12px;
		background: #16181c;
		border-radius: 12px;
	}
	.x-trends strong {
		font-size: 12px;
	}
	.x-trends div {
		display: grid;
		padding-top: 9px;
		gap: 2px;
		font-size: 9px;
		color: #71767b;
	}
	.x-trends b {
		color: #e7e9ea;
		font-size: 10px;
	}
	/* YouTube — real player proportions, search/navigation and recommendation surfaces. */
	.youtube {
		background: white;
		color: #0f0f0f;
	}
	.youtube-top {
		display: flex;
		align-items: center;
		height: 38px;
		gap: 6px;
		padding: 0 10px;
		background: #fff;
	}
	.youtube-menu {
		margin-right: 3px;
		font-size: 12px;
	}
	.yt-mark {
		display: grid;
		place-items: center;
		width: 23px;
		height: 16px;
		border-radius: 5px;
		background: #f03;
		color: white;
		font-size: 10px;
	}
	.youtube-top b {
		font-size: 13px;
		letter-spacing: -0.8px;
	}
	.yt-search {
		display: flex;
		align-items: center;
		gap: 5px;
		margin-left: auto;
		width: 31%;
		overflow: hidden;
		padding: 5px 7px;
		color: #707070;
		border: 1px solid #ccc;
		border-radius: 17px;
		font-size: 9px;
	}
	.yt-profile {
		display: grid;
		place-items: center;
		width: 21px;
		height: 21px;
		margin-left: 4px;
		border-radius: 50%;
		background: #5c7ab7;
		color: white;
	}
	.yt-content {
		padding: 0 9px 12px;
	}
	.yt-chips {
		display: flex;
		gap: 5px;
		padding: 5px 0 8px;
		overflow: hidden;
		white-space: nowrap;
	}
	.yt-chips span {
		padding: 4px 7px;
		border-radius: 5px;
		background: #f2f2f2;
		font-size: 9px;
	}
	.yt-chips span:first-child {
		background: #0f0f0f;
		color: white;
	}
	.yt-player {
		margin-bottom: 9px;
	}
	.yt-poster {
		display: block;
		width: 100%;
		height: 118px;
		position: relative;
		overflow: hidden;
		border: 0;
		padding: 0;
		background: #394b5a;
		text-align: left;
		color: white;
	}
	.yt-visual {
		position: absolute;
		inset: 0;
		overflow: hidden;
		background: linear-gradient(#4e819a 0%, #c3b69a 53%, #526c73 55%, #243a40 100%);
	}
	.yt-visual::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(transparent 40%, #0009);
	}
	.yt-sun {
		position: absolute;
		top: 16px;
		right: 31%;
		width: 27px;
		height: 27px;
		background: #f3d39e;
		border-radius: 50%;
		box-shadow: 0 0 35px 18px #eecc9970;
	}
	.yt-mountain {
		position: absolute;
		bottom: 13px;
		left: -15%;
		width: 90%;
		height: 58px;
		clip-path: polygon(0 100%, 27% 20%, 43% 65%, 60% 2%, 100% 100%);
		background: #283d49;
	}
	.yt-mountain.second {
		left: 45%;
		bottom: 8px;
		background: #1b303e;
		transform: scale(1.25);
	}
	.yt-road {
		position: absolute;
		bottom: -25px;
		left: 37%;
		width: 30%;
		height: 80px;
		transform: perspective(70px) rotateX(48deg);
		background: #a59b80;
		clip-path: polygon(44% 0, 56% 0, 100% 100%, 0 100%);
	}
	.yt-poster.pixelated .yt-visual {
		filter: blur(3px) saturate(0.55);
		transform: scale(1.04);
	}
	.yt-poster.playing .yt-visual {
		animation: pan 8s linear infinite alternate;
	}
	.yt-play-icon {
		position: absolute;
		top: 50%;
		left: 50%;
		display: grid;
		place-items: center;
		width: 40px;
		height: 29px;
		transform: translate(-50%, -50%);
		background: #000b;
		border-radius: 9px;
	}
	.yt-controls {
		position: absolute;
		bottom: 7px;
		left: 10px;
		right: 10px;
		display: flex;
		align-items: center;
		gap: 7px;
		z-index: 1;
		font-size: 9px;
	}
	.yt-controls :global(svg) {
		flex-shrink: 0;
	}
	.yt-controls .yt-time {
		white-space: nowrap;
	}
	.yt-audio {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 4px;
		min-width: 0;
		color: white;
	}
	.yt-audio[data-ready='false'] {
		color: #ffe89a;
	}
	.audio-wait {
		font-size: 9px;
		white-space: nowrap;
	}
	.yt-progress {
		position: absolute;
		z-index: 2;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: #bbb6;
	}
	.yt-progress i {
		display: block;
		width: 17%;
		height: 100%;
		background: red;
	}
	.yt-progress.running i {
		animation: play-progress 12s linear forwards;
	}
	.yt-player h4 {
		margin: 7px 0 5px;
		font-size: 11px;
		line-height: 1.25;
	}
	.yt-video-info {
		display: flex;
		gap: 6px;
		align-items: center;
	}
	.yt-video-info b,
	.yt-video-info small {
		display: block;
		font-size: 9px;
	}
	.yt-video-info small {
		color: #777;
	}
	.yt-channel-avatar {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		color: white;
		background: #567362;
		font-weight: 700;
	}
	.yt-subscribe {
		margin-left: auto;
		background: #0f0f0f;
		color: white;
		padding: 5px 8px;
		border-radius: 15px;
		font-size: 9px;
	}
	.yt-actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		padding: 8px 0;
		color: #333;
		font-size: 9px;
	}
	.yt-actions span {
		display: flex;
		align-items: center;
		gap: 4px;
	}
	.shorts-section {
		margin: 10px 0;
		border-top: 1px solid #ddd;
		padding-top: 9px;
	}
	.shorts-section h5,
	.yt-next h5 {
		margin: 0 0 8px;
		font-size: 12px;
	}
	.shorts-glyph {
		color: red;
	}
	.shorts-row {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 5px;
	}
	.short-card {
		display: flex;
		align-items: end;
		padding: 7px;
		height: 81px;
		border-radius: 7px;
		background: linear-gradient(140deg, #8e6d85, #f1bf8e);
		font-weight: 700;
		font-size: 9px;
		color: white;
		text-shadow: 0 1px 2px #333;
	}
	.card-two {
		background: linear-gradient(130deg, #628b80, #ccb36f);
	}
	.card-three {
		background: linear-gradient(130deg, #5977a0, #aebcd1);
	}
	.yt-next {
		padding-top: 8px;
		border-top: 1px solid #eee;
	}
	.next-video {
		display: flex;
		gap: 7px;
		margin: 7px 0;
	}
	.next-thumb {
		flex: 0 0 75px;
		height: 45px;
		border-radius: 5px;
		background: linear-gradient(140deg, #85a2bc, #d7b383);
	}
	.next-thumb.alt {
		background: linear-gradient(140deg, #58716f, #dfc1a2);
	}
	.next-video b,
	.next-video small {
		display: block;
		font-size: 9px;
		line-height: 1.4;
	}
	.next-video small {
		color: #666;
		margin-top: 4px;
	}
	/* Netflix — black canvas, red wordmark and cinematic shelves. */
	.netflix {
		background: #141414;
		color: #fff;
	}
	.netflix-top {
		display: flex;
		align-items: center;
		gap: 10px;
		height: 38px;
		padding: 0 10px;
		background: #141414;
	}
	.netflix-top strong {
		margin-right: 3px;
		font-weight: 900;
		letter-spacing: -0.8px;
		font-size: 13px;
		color: #e50914;
	}
	.netflix-top span {
		font-size: 9px;
		color: #eee;
	}
	.netflix-top .nfx-profile {
		margin-left: auto;
		background: #367c7d;
		padding: 4px 7px;
		border-radius: 3px;
		font-weight: 700;
	}
	.netflix-content {
		scrollbar-color: #777 transparent;
	}
	.nfx-hero {
		height: 171px;
		position: relative;
		overflow: hidden;
		background: linear-gradient(150deg, #172b3c 0%, #58717c 51%, #b88a65 100%);
	}
	.nfx-hero.motion::before {
		content: '';
		position: absolute;
		inset: -10%;
		background: linear-gradient(125deg, transparent, #fff2, transparent);
		animation: trailer-pan 4s ease-in-out infinite alternate;
	}
	.nfx-hero::after {
		content: '';
		position: absolute;
		inset: 0;
		background:
			linear-gradient(90deg, #111d, #1112 80%),
			linear-gradient(0deg, #141414, transparent 48%);
	}
	.nfx-sun {
		position: absolute;
		top: 26px;
		right: 17%;
		width: 58px;
		height: 58px;
		border-radius: 50%;
		background: #e1b98a;
		box-shadow: 0 0 75px #e3b88a;
	}
	.nfx-city {
		position: absolute;
		bottom: 0;
		right: 0;
		width: 68%;
		height: 68px;
		background: linear-gradient(
			90deg,
			#182532 6%,
			transparent 6% 10%,
			#253746 10% 18%,
			transparent 18% 22%,
			#1b303e 22% 38%,
			transparent 38% 40%,
			#152a38 40% 50%,
			transparent 50% 54%,
			#273d49 54% 72%,
			transparent 72% 77%,
			#1b2836 77%
		);
		opacity: 0.85;
	}
	.nfx-hero-copy {
		position: absolute;
		z-index: 1;
		top: 27px;
		left: 11px;
	}
	.nfx-hero-copy small {
		font-size: 8px;
		letter-spacing: 1.4px;
	}
	.nfx-hero-copy small b {
		color: #ddd;
	}
	.nfx-hero-copy h4 {
		font-size: 23px;
		letter-spacing: 1px;
		line-height: 0.95;
		margin: 8px 0 6px;
		font-weight: 900;
		text-shadow: 0 2px 5px #0006;
	}
	.nfx-hero-copy p {
		margin: 0 0 10px;
		font-size: 10px;
	}
	.nfx-buttons {
		display: flex;
		gap: 5px;
	}
	.nfx-buttons span {
		display: flex;
		gap: 3px;
		align-items: center;
		padding: 5px 8px;
		border-radius: 2px;
		font-size: 9px;
		background: #fff;
		color: #111;
		font-weight: 700;
	}
	.nfx-buttons span:last-child {
		color: white;
		background: #aaa6;
	}
	.nfx-live,
	.nfx-paused {
		position: absolute;
		z-index: 1;
		right: 9px;
		bottom: 10px;
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 9px;
		color: #ddd;
		background: #0008;
		padding: 4px;
		border-radius: 2px;
	}
	.nfx-live span {
		width: 5px;
		height: 5px;
		background: #f22;
		border-radius: 50%;
		animation: pulse 1.2s infinite;
	}
	.nfx-shelf {
		margin: 1px 0 11px;
		padding: 2px 0 0 9px;
	}
	.nfx-shelf h5 {
		margin: 0 0 7px;
		font-size: 11px;
		font-weight: 700;
	}
	.nfx-covers {
		display: flex;
		gap: 6px;
		overflow: hidden;
	}
	.nfx-cover {
		flex: 0 0 83px;
		height: 63px;
		display: flex;
		justify-content: center;
		align-items: center;
		color: white;
		font-size: 12px;
		font-weight: 900;
		text-align: center;
		line-height: 1.1;
		letter-spacing: 1px;
		text-shadow: 0 2px 4px #000;
		background: linear-gradient(130deg, #536579, #151d33);
	}
	.cover-two {
		background: linear-gradient(130deg, #78705d, #272c2b);
	}
	.cover-three {
		background: linear-gradient(140deg, #47665a, #192628);
	}
	.cover-four {
		background: linear-gradient(140deg, #705057, #2e1e31);
	}
	/* This models the actual engine's simple checkbox overlay, not an external CAPTCHA service. */
	.captcha-screen {
		position: absolute;
		z-index: 10;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 17px;
		background: #fff;
		color: #282727;
		padding: 12px;
		font:
			12px Arial,
			Helvetica,
			sans-serif;
	}
	.captcha-screen p {
		margin: 0;
		max-width: 230px;
		text-align: center;
		font-size: 12px;
		font-weight: 600;
	}
	.captcha-widget {
		width: min(100%, 270px);
		min-height: 65px;
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 10px;
		border: 1px solid #d3d3d3;
		background: #f9f9f9;
		border-radius: 3px;
		box-shadow: 0 1px 5px #0002;
	}
	.captcha-widget > span:nth-child(2) {
		font-size: 12px;
		font-weight: 500;
		white-space: nowrap;
	}
	.captcha-check {
		flex: 0 0 25px;
		width: 25px;
		height: 25px;
		display: grid;
		place-items: center;
		border: 0;
		padding: 0;
		background: transparent;
		color: #159753;
	}
	.captcha-empty {
		display: block;
		width: 23px;
		height: 23px;
		border: 2px solid #c1c1c1;
		background: white;
		border-radius: 2px;
	}
	.captcha-spinner {
		width: 23px;
		height: 23px;
		border: 3px solid #cfdae7;
		border-top-color: #3479cc;
		border-radius: 50%;
		animation: spin 850ms linear infinite;
	}
	.captcha-check:disabled {
		cursor: default;
	}
	.captcha-brand {
		margin-left: auto;
		display: grid;
		justify-items: center;
		gap: 1px;
		color: #888;
	}
	.captcha-brand small {
		font-size: 8px;
	}
	.spinning {
		animation: spin 900ms linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes pan {
		to {
			transform: scale(1.12) translateX(-2%);
		}
	}
	@keyframes trailer-pan {
		to {
			transform: translateX(18%);
		}
	}
	@keyframes play-progress {
		to {
			width: 100%;
		}
	}
	@keyframes pulse {
		50% {
			opacity: 0.25;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.replica * {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
