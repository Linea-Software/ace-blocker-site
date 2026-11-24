import { createMemo, createSignal, onSettled, Show } from 'solid-js';
import { revalidate, useLocation, useSearchParams } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { CheckCircle2, CircleAlert, Download, Loader2, RefreshCw } from '@lucide/solid';
import { apiClient } from '$lib/api-client';
import { buildEngineLinkUrl } from '$lib/utils';
import { pollForProConfirmation } from '$lib/utils/checkout-confirmation';
import * as m from '$lib/paraglide/messages';
import { getCompletedData } from './data';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';

type CompletedData = Awaited<ReturnType<typeof getCompletedData>>;
function Completed(props: { data: CompletedData; failed: boolean; currentUrl: string }) {
	const [verification, setVerification] = createSignal<'checking' | 'pending' | 'error'>(
		'checking'
	);
	const [activation, setActivation] = createSignal<'idle' | 'activating' | 'pending' | 'failed'>(
		'idle'
	);
	let verificationBusy = false;
	let verificationAbort: AbortController | null = null;
	const isPro = () => 'isPro' in props.data && props.data.isPro === true;
	const succeeded = () => !props.failed;
	const title = () =>
		props.failed ? m.checkout_page_title_failed() : m.checkout_page_title_success();
	const button =
		'inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-accent';

	function waitForVerification(signal: AbortSignal): Promise<void> {
		return new Promise((resolve, reject) => {
			if (signal.aborted) return reject(new Error('Verification cancelled'));
			const onAbort = () => {
				clearTimeout(timer);
				reject(new Error('Verification cancelled'));
			};
			const timer = setTimeout(() => {
				signal.removeEventListener('abort', onAbort);
				resolve();
			}, 2000);
			signal.addEventListener('abort', onAbort, { once: true });
		});
	}
	async function verifyProStatus() {
		if (verificationBusy) return;
		verificationBusy = true;
		setVerification('checking');
		verificationAbort?.abort();
		const controller = new AbortController();
		verificationAbort = controller;
		try {
			const result = await pollForProConfirmation(
				async () => {
					const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]);
					const response = await fetch('/api/v1/account/verify-pro', {
						method: 'POST',
						signal
					});
					if (!response.ok)
						throw new Error(`Verification returned HTTP ${response.status}`);
					const body: { isActive: boolean } = await response.json();
					return body.isActive;
				},
				() => waitForVerification(controller.signal)
			);
			if (controller.signal.aborted) return;
			if (result === 'active') await revalidate(getCompletedData.key);
			else setVerification('pending');
		} catch (error) {
			if (!controller.signal.aborted) {
				console.error('Pro verification failed', error);
				setVerification('error');
			}
		} finally {
			verificationBusy = false;
		}
	}
	// Desktop linking is never triggered on mount or by the Dodo return URL.
	async function activateInApp() {
		setActivation('activating');
		try {
			const { data: keyData, error: keyError } =
				await apiClient.v1.account['api-key'].create.get();
			if (keyError) throw new Error((keyError.value as string) || 'Failed to create API key');
			if (!keyData) throw new Error('Failed to create API key');
			window.location.href = buildEngineLinkUrl(keyData.apiKey);
			setActivation('pending');
		} catch (error) {
			console.error('Activation error', error);
			setActivation('failed');
		}
	}
	onSettled(() => {
		if (succeeded() && !isPro() && props.data.success) void verifyProStatus();
		return () => {
			verificationAbort?.abort();
		};
	});
	return (
		<>
			<Title>{title()}</Title>
			<Meta name="description" content={m.page_description_checkout_completed()} />
			<Meta property="og:title" content={title()} />
			<Meta property="og:description" content={m.page_description_checkout_completed()} />
			<Meta property="og:url" content={props.currentUrl} />
			<Meta name="robots" content="noindex, nofollow" />
			<Meta name="twitter:title" content={title()} />
			<Meta name="twitter:description" content={m.page_description_checkout_completed()} />
			<Navbar isPro={isPro()} />
			<Show
				when={props.failed}
				fallback={
					<Show
						when={!isPro()}
						fallback={
							<main id="main-content">
								<section class="border-b border-border">
									<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:py-20">
										<div>
											<div class="mb-7 flex size-11 items-center justify-center rounded-md border border-success/35 bg-success/10 text-success">
												<CheckCircle2 class="size-5" />
											</div>
											<p class="font-mono text-xs text-success">
												{m.checkout_pro_active()}
											</p>
											<h1 class="mt-4 font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl">
												{m.checkout_success_title()}
											</h1>
										</div>
										<p class="max-w-2xl text-lg leading-relaxed text-muted-foreground">
											{m.checkout_success_subtitle()}
										</p>
									</div>
								</section>
								<section class="border-b border-border bg-card py-12 sm:py-16">
									<div class="ace-shell">
										<h2 class="mb-6 font-display text-3xl font-semibold">
											{m.checkout_next_title()}
										</h2>
										<div class="overflow-hidden rounded-lg border border-border bg-background">
											<div class="grid gap-5 border-b border-border p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
												<div>
													<h3 class="font-display text-xl font-semibold">
														{m.checkout_sync_header()}
													</h3>
													<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
														{m.checkout_sync_description()}
													</p>
												</div>
												<div
													class={
														'inline-flex min-h-10 w-fit items-center gap-2 rounded-md border px-3 font-mono text-xs ' +
														(activation() === 'failed'
															? 'border-danger/35 bg-danger/10 text-danger'
															: 'border-information/35 bg-information/10 text-information')
													}
													aria-live="polite"
												>
													<Show
														when={activation() === 'activating'}
														fallback={
															<Show
																when={activation() === 'pending'}
																fallback={
																	<Show
																		when={
																			activation() ===
																			'failed'
																		}
																		fallback={m.checkout_activation_idle()}
																	>
																		<CircleAlert class="size-3.5" />
																		{m.checkout_activation_failed()}
																	</Show>
																}
															>
																<CircleAlert class="size-3.5" />
																{m.checkout_activation_pending()}
															</Show>
														}
													>
														<Loader2 class="size-3.5 animate-spin" />
														{m.checkout_activation_activating()}
													</Show>
												</div>
											</div>
											<div class="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
												<div>
													<h3 class="font-display text-xl font-semibold">
														{m.checkout_client_header()}
													</h3>
													<p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
														{m.checkout_client_description()}
													</p>
												</div>
												<a
													href="/download"
													class={button + ' w-full sm:w-auto'}
												>
													<Download class="size-4" />
													{m.checkout_download_button()}
												</a>
											</div>
										</div>
										<Show when={activation() === 'pending'}>
											<p
												class="mt-4 max-w-3xl border-l-4 border-information bg-information/5 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
												role="status"
											>
												{m.checkout_activation_pending_detail()}
											</p>
										</Show>
										<Show when={activation() !== 'activating'}>
											<button
												type="button"
												onClick={() => void activateInApp()}
												class={button + ' mt-4'}
											>
												<RefreshCw class="size-4" />
												{m.checkout_activation_retry()}
											</button>
										</Show>
									</div>
								</section>
								<section>
									<div class="ace-shell grid gap-8 py-10 md:grid-cols-[0.55fr_1fr] md:items-start">
										<div>
											<h2 class="font-display text-xl font-semibold">
												{m.checkout_status_title()}
											</h2>
											<p class="mt-2 font-mono text-xs text-success">
												{m.checkout_sync_badge()}
											</p>
										</div>
										<div>
											<a
												href="/"
												class="inline-flex min-h-11 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background hover:opacity-90"
											>
												{m.checkout_return_button()}
											</a>
											<div class="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-border pt-5 text-sm">
												<span class="font-medium">
													{m.checkout_help_title()}
												</span>
												<a
													href="/download"
													class="text-muted-foreground hover:underline"
												>
													{m.checkout_setup_guide()}
												</a>
												<a
													href="mailto:support@aceblocker.com"
													class="text-muted-foreground hover:underline"
												>
													{m.checkout_help_center()}
												</a>
											</div>
										</div>
									</div>
								</section>
							</main>
						}
					>
						<main id="main-content" class="ace-shell min-h-[55vh] py-16 sm:py-24">
							<div class="max-w-2xl border-l-4 border-signal pl-6">
								<Show
									when={props.data.success && verification() === 'checking'}
									fallback={
										<CircleAlert class="size-6 text-signal-deep dark:text-signal" />
									}
								>
									<Loader2 class="size-6 animate-spin text-signal-deep dark:text-signal" />
								</Show>
								<h1 class="mt-5 font-display text-4xl font-semibold">
									{props.data.success && verification() === 'checking'
										? m.checkout_pending_title()
										: m.checkout_pending_delayed_title()}
								</h1>
								<p class="mt-4 text-muted-foreground" role="status">
									{!props.data.success || verification() === 'error'
										? m.checkout_pending_error_description()
										: verification() === 'pending'
											? m.checkout_pending_delayed_description()
											: m.checkout_pending_description()}
								</p>
								<div class="mt-7 flex flex-wrap gap-3">
									<Show
										when={props.data.success && verification() !== 'checking'}
									>
										<button
											type="button"
											onClick={() => void verifyProStatus()}
											class="inline-flex min-h-11 items-center gap-2 rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
										>
											<RefreshCw class="size-4" />
											{m.checkout_pending_retry()}
										</button>
									</Show>
									<a href="/account" class={button}>
										{m.checkout_pending_account()}
									</a>
								</div>
							</div>
						</main>
					</Show>
				}
			>
				<main id="main-content">
					<section class="border-b border-border">
						<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[0.72fr_1.28fr] lg:items-end lg:py-20">
							<div>
								<div class="mb-7 flex size-11 items-center justify-center rounded-md border border-danger/35 bg-danger/10 text-danger">
									<CircleAlert class="size-5" />
								</div>
								<h1 class="font-display text-5xl leading-[0.92] font-semibold tracking-tight sm:text-6xl">
									{m.checkout_failed_title()}
								</h1>
							</div>
							<div class="max-w-2xl">
								<p class="text-lg leading-relaxed text-muted-foreground">
									{m.checkout_failed_subtitle()}
								</p>
								<a
									href="/get-pro"
									class="mt-7 inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
								>
									{m.checkout_retry_button()}
								</a>
							</div>
						</div>
					</section>
					<section class="bg-card">
						<div class="ace-shell grid gap-6 py-10 sm:grid-cols-[0.45fr_1fr] sm:items-start">
							<p class="font-display text-xl font-semibold">
								{m.checkout_support_header()}
							</p>
							<div class="flex flex-wrap gap-x-7 gap-y-3 text-sm">
								<a
									href="mailto:support@aceblocker.com"
									class="font-medium hover:underline"
								>
									{m.checkout_support_link()}
								</a>
								<a
									href="mailto:support@aceblocker.com"
									class="text-muted-foreground hover:text-foreground hover:underline"
								>
									{m.checkout_support_email()}
								</a>
							</div>
						</div>
					</section>
				</main>
			</Show>
			<MarketingFooter />
		</>
	);
}

export default function CheckoutCompletedPage() {
	const location = useLocation();
	const [params] = useSearchParams();
	const data = createMemo(() => getCompletedData());
	const currentUrl = () => location.pathname + location.search;
	return (
		<Show when={data()}>
			{(value) => (
				<Completed
					data={value()}
					failed={params.status === 'failed'}
					currentUrl={currentUrl()}
				/>
			)}
		</Show>
	);
}
