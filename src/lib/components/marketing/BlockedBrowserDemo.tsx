import { ArrowLeft, ArrowRight, CornerDownLeft, Globe2, RotateCw, X } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import styles from './BlockedBrowserDemo.module.css';
const cls = (value: string) =>
	value
		.split(/\s+/)
		.map((part) => (styles[part] ? part + ' ' + styles[part] : part))
		.join(' ');
export interface BlockedBrowserProps {
	domain: string;
	phase: 'ready' | 'typed' | 'loading' | 'result';
	blocked: boolean;
	onAddress: () => void;
	onNavigate: () => void;
	onBack: () => void;
}
export default function BlockedBrowserDemo(props: BlockedBrowserProps) {
	return (
		<section
			class={cls('browser-scene')}
			aria-label={m.demo_browser_heading()}
			data-testid="blocked-browser-demo"
		>
			<div class={cls('browser-scene-header')}>
				<div>
					<span class={cls('eyebrow')}>{m.demo_browser_simulated_time()}</span>
					<h3>{m.demo_browser_heading()}</h3>
				</div>
				<button type="button" class={cls('back-to-rule')} onClick={props.onBack}>
					<ArrowLeft size={15} aria-hidden="true" />
					{m.demo_browser_back()}
				</button>
			</div>
			<div class={cls('browser-window')} aria-label={m.demo_browser_window_label()}>
				<div class={cls('browser-chrome')}>
					<div class={cls('window-controls')} aria-hidden="true">
						<span />
						<span />
						<span />
					</div>
					<div class={cls('navigation-icons')} aria-hidden="true">
						<ArrowLeft size={14} />
						<ArrowRight size={14} />
						<RotateCw size={13} />
					</div>
					<div class={cls('address-container')}>
						<button
							type="button"
							class={
								cls('address-bar') +
								(props.phase === 'typed' ? ' ' + cls('address-active') : '')
							}
							data-demo-target="browser-address"
							aria-label={m.demo_browser_address()}
							onClick={props.onAddress}
						>
							<Globe2 size={13} aria-hidden="true" />
							{props.phase === 'ready' ? (
								<span class={cls('placeholder')}>
									{m.demo_browser_address_hint()}
								</span>
							) : (
								<span
									class={
										cls('browser-url') +
										(props.phase === 'typed' ? ' ' + cls('typing') : '')
									}
								>
									https://{props.domain}
								</span>
							)}
						</button>
						<button
							type="button"
							class={cls('navigate')}
							data-demo-target="browser-go"
							aria-label={m.demo_browser_navigate()}
							disabled={props.phase === 'ready' || props.phase === 'loading'}
							onClick={props.onNavigate}
						>
							<CornerDownLeft size={15} aria-hidden="true" />
						</button>
					</div>
					<X class={cls('chrome-close')} size={13} aria-hidden="true" />
				</div>
				<div class={cls('browser-page')} aria-live="polite" aria-atomic="true">
					{props.phase === 'ready' || props.phase === 'typed' ? (
						<div class={cls('page-placeholder')}>
							<Globe2 size={28} aria-hidden="true" />
							<p>{m.demo_browser_ready()}</p>
						</div>
					) : props.phase === 'loading' ? (
						<div class={cls('page-placeholder')}>
							<span class={cls('loading-ring')} aria-hidden="true" />
							<p>{m.demo_browser_loading()}</p>
						</div>
					) : props.blocked ? (
						<div class={cls('response')}>
							<span class={cls('http-status')}>HTTP 404</span>
							<strong>404</strong>
							<h4>{m.demo_browser_404_title()}</h4>
							<p>{m.demo_browser_404_description()}</p>
						</div>
					) : (
						<div class={cls('response')}>
							<span class={cls('http-status')}>HTTP</span>
							<h4>{m.demo_browser_allowed_title()}</h4>
							<p>{m.demo_browser_allowed_description()}</p>
						</div>
					)}
				</div>
			</div>
			<div class={cls('browser-caption')}>
				<p>
					{props.phase === 'result'
						? props.blocked
							? m.demo_browser_404_explanation()
							: m.demo_browser_allowed_explanation()
						: m.demo_browser_preview_note()}
				</p>
			</div>
		</section>
	);
}
