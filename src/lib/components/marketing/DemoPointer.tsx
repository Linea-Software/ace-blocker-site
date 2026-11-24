import { createEffect, createSignal, Show } from 'solid-js';
import { MousePointer2 } from '@lucide/solid';
import type { DemoPhase } from './DemoPlayback';
import styles from './DemoPointer.module.css';

type PointerProps = {
	root: HTMLElement | undefined;
	target: string;
	visible: boolean;
	phase?: DemoPhase;
	travelMs?: number;
};

export default function DemoPointer(props: PointerProps) {
	const [x, setX] = createSignal(28);
	const [y, setY] = createSignal(70);
	let initialized = false;
	createEffect(
		() => ({ container: props.root, name: props.target, enabled: props.visible }),
		({ container, name, enabled }) => {
			if (!container || !enabled) {
				initialized = false;
				return;
			}
			let disposed = false;
			let frame = 0;
			let observer: ResizeObserver | undefined;
			let node: HTMLElement | null = null;
			if (!initialized) {
				setX(Math.min(34, container.clientWidth * 0.08));
				setY(Math.min(90, container.clientHeight * 0.18));
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
					setX(Math.max(6, Math.min(rect.width - 26, nextX)));
					setY(Math.max(6, Math.min(rect.height - 30, nextY)));
				});
			};
			// Effects run after the DOM commit, but the next walkthrough stage may need a frame.
			frame = requestAnimationFrame(() => {
				if (disposed) return;
				node = container.querySelector<HTMLElement>(
					'[data-demo-target="' + CSS.escape(name) + '"]'
				);
				if (!node) return;
				update();
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
		}
	);
	return (
		<Show when={props.visible}>
			<span
				class={
					'demo-pointer ' +
					styles['demo-pointer'] +
					(props.phase === 'press' ? ' ' + styles.pressed : '')
				}
				aria-hidden="true"
				data-demo-pointer-phase={props.phase ?? 'idle'}
				data-demo-pointer-target={props.target}
				style={{
					'--cursor-x': x() + 'px',
					'--cursor-y': y() + 'px',
					'--cursor-travel': (props.travelMs ?? 660) + 'ms'
				}}
			>
				<MousePointer2 size={22} fill="var(--foreground)" strokeWidth={1.6} />
				<span class={'click-ring ' + styles['click-ring']} />
			</span>
		</Show>
	);
}
