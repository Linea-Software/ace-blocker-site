import { Show } from 'solid-js';
import { Play, Pause, RotateCcw, ArrowLeft, ArrowRight } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import type { DemoPlayback } from './DemoPlayback';
import styles from './WalkthroughControls.module.css';
const cls = (s: string) =>
	s
		.split(/\s+/)
		.map((x) => (styles[x] ? x + ' ' + styles[x] : x))
		.join(' ');

export default function WalkthroughControls(props: {
	playback: DemoPlayback;
	onNavigate?: () => void;
}) {
	const navigate = () => props.onNavigate?.();
	return (
		<div class={cls('walkthrough')} role="group" aria-label={m.demo_walkthrough_label()}>
			<div class={cls('walkthrough-actions')}>
				<Show
					when={props.playback.playing}
					fallback={
						<button
							type="button"
							onClick={() => {
								navigate();
								props.playback.play();
							}}
							aria-label={m.demo_play()}
						>
							<Play size={15} aria-hidden="true" />
							{m.demo_play()}
						</button>
					}
				>
					<button
						type="button"
						onClick={() => props.playback.pause()}
						aria-label={m.demo_pause()}
					>
						<Pause size={15} aria-hidden="true" />
						{m.demo_pause()}
					</button>
				</Show>
				<button
					type="button"
					onClick={() => {
						navigate();
						props.playback.replay();
					}}
					aria-label={m.demo_replay()}
				>
					<RotateCcw size={15} aria-hidden="true" />
					{m.demo_replay()}
				</button>
			</div>
			<div class={cls('walkthrough-actions')}>
				<span class={cls('progress')} aria-live="polite">
					{m.demo_progress({
						current: props.playback.step + 1,
						total: props.playback.total
					})}
				</span>
				<button
					type="button"
					onClick={() => {
						navigate();
						props.playback.previous();
					}}
					disabled={props.playback.step < 0}
					aria-label={m.demo_previous()}
				>
					<ArrowLeft size={16} aria-hidden="true" />
				</button>
				<button
					type="button"
					onClick={() => {
						navigate();
						props.playback.next();
					}}
					disabled={props.playback.step === props.playback.total - 1}
					aria-label={m.demo_next()}
				>
					<ArrowRight size={16} aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}
