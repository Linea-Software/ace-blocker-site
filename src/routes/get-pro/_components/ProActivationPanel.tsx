import { For, Show } from 'solid-js';
import {
	ArrowUpRight,
	Check,
	CircleAlert,
	Download,
	KeyRound,
	Loader2,
	MonitorCheck,
	RefreshCw
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
export type ActivationStatus = 'idle' | 'loading' | 'pending' | 'error';
export default function ProActivationPanel(props: {
	status: () => ActivationStatus;
	onActivate: () => void;
}) {
	const steps = [
		{ title: m.pro_activation_step_account, description: m.pro_activation_step_account_detail },
		{ title: m.pro_activation_step_launch, description: m.pro_activation_step_launch_detail },
		{ title: m.pro_activation_step_verify, description: m.pro_activation_step_verify_detail }
	];
	const link =
		'inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-accent';
	return (
		<div class="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
			<div class="min-w-0">
				<div class="inline-flex items-center gap-2 border-l-4 border-success bg-success/10 px-3 py-2 text-sm font-medium text-success">
					<Check class="size-4" />
					{m.pro_activation_web_active()}
				</div>
				<h1 class="mt-6 max-w-2xl font-display text-5xl leading-[0.98] font-semibold tracking-tight sm:text-6xl">
					{m.pro_activation_title()}
				</h1>
				<p class="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
					{m.pro_activation_description()}
				</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a
						href="/connect"
						class="inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
					>
						{m.device_link_title()}
					</a>
					<button
						type="button"
						class={link}
						disabled={props.status() === 'loading'}
						onClick={props.onActivate}
					>
						<Show
							when={props.status() === 'loading'}
							fallback={
								<Show
									when={
										props.status() === 'pending' || props.status() === 'error'
									}
									fallback={<ArrowUpRight class="size-4" />}
								>
									<RefreshCw class="size-4" />
								</Show>
							}
						>
							<Loader2 class="size-4 animate-spin" />
						</Show>
						{props.status() === 'pending' || props.status() === 'error'
							? m.pro_activation_retry()
							: m.pro_activation_open()}
					</button>
					<a href="/download" class={link}>
						<Download class="size-4" />
						{m.checkout_download_button()}
					</a>
				</div>
				<a
					href="/"
					class="mt-6 inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
				>
					{m.pro_success_home()}
				</a>
			</div>
			<div class="overflow-hidden rounded-lg border border-border bg-card">
				<div class="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-5 py-4">
					<h2 class="flex items-center gap-2 font-display text-lg font-semibold">
						<KeyRound class="size-5" />
						{m.pro_activation_steps_title()}
					</h2>
					<span class="font-mono text-xs text-muted-foreground">01 / 03</span>
				</div>
				<ol class="divide-y divide-border">
					<For each={steps}>
						{(step, index) => (
							<li class="flex gap-4 p-5">
								<span class="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground">
									<Show
										when={index() === 0}
										fallback={
											<Show
												when={index() === 2}
												fallback={
													<Show
														when={props.status() === 'loading'}
														fallback={
															<Show
																when={props.status() === 'error'}
																fallback={
																	<ArrowUpRight class="size-4" />
																}
															>
																<CircleAlert class="size-4 text-danger" />
															</Show>
														}
													>
														<Loader2 class="size-4 animate-spin" />
													</Show>
												}
											>
												<MonitorCheck class="size-4" />
											</Show>
										}
									>
										<Check class="size-5 text-success" />
									</Show>
								</span>
								<div class="min-w-0">
									<p class="font-semibold">{step.title()}</p>
									<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
										{step.description()}
									</p>
								</div>
							</li>
						)}
					</For>
				</ol>
				<div
					class={
						'border-t border-border px-5 py-4 text-sm ' +
						(props.status() === 'error'
							? 'bg-danger/10'
							: props.status() === 'pending'
								? 'bg-information/10'
								: 'bg-muted/40')
					}
					role="status"
					aria-live="polite"
				>
					<p class="font-semibold">
						{props.status() === 'error'
							? m.pro_activation_status_error()
							: props.status() === 'pending'
								? m.pro_activation_status_pending()
								: props.status() === 'loading'
									? m.pro_activation_status_loading()
									: m.pro_activation_status_idle()}
					</p>
					<p class="mt-1 leading-relaxed text-muted-foreground">
						{props.status() === 'error'
							? m.pro_activation_error_detail()
							: m.pro_activation_pending_detail()}
					</p>
				</div>
			</div>
		</div>
	);
}
