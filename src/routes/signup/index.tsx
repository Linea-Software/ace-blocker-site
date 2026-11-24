import { createEffect, createSignal, Show } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { Meta, Title } from '@solidjs/meta';
import { Mail } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import { localizeHref } from '$lib/paraglide/runtime';
import * as m from '$lib/paraglide/messages.js';
import AuthBrandedPanel from '$lib/components/AuthBrandedPanel';
import AuthMobileHeader from '$lib/components/AuthMobileHeader';
import AuthTopBar from '$lib/components/AuthTopBar';
import { deliverApiKeyToEngine } from '$lib/utils/engine-link';
import SignUpForm from './_components/SignUpForm';

export default function SignUpPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const origin = () => new URLSearchParams(location.search).get('origin');
	const isEngine = () => origin() === 'ace-engine' || origin() === 'aceblocker';
	const [isSubmitted, setIsSubmitted] = createSignal(false);
	const [submittedEmail, setSubmittedEmail] = createSignal('');
	const [linkPending, setLinkPending] = createSignal(false);
	const [linkError, setLinkError] = createSignal(false);
	let linkPromise: Promise<boolean> | null = null;

	function linkEngine(): Promise<boolean> {
		if (linkPromise) return linkPromise;
		linkPromise = (async () => {
			try {
				await deliverApiKeyToEngine();
				setLinkPending(true);
				return true;
			} catch {
				setLinkError(true);
				return false;
			}
		})();
		return linkPromise;
	}
	createEffect(
		() => Boolean(session()?.data && !isEngine()),
		(ready) => {
			if (ready) navigate(localizeHref('/'));
		}
	);
	return (
		<>
			<Title>{m.page_title_sign_up()}</Title>
			<Meta name="description" content={m.auth_sign_up_description()} />
			<Meta property="og:title" content={m.page_title_sign_up()} />
			<Meta property="og:description" content={m.auth_sign_up_description()} />
			<Meta name="twitter:title" content={m.page_title_sign_up()} />
			<Meta name="twitter:description" content={m.auth_sign_up_description()} />
			<div class="flex min-h-screen w-full bg-background text-foreground">
				<AuthBrandedPanel />
				<main class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2">
					<AuthMobileHeader switchHref="/signin" switchLabel={m.auth_sign_in_button()} />
					<AuthTopBar backLabel={m.auth_back_home()} />
					<div class="w-full max-w-md">
						<Show
							when={linkError()}
							fallback={
								<Show
									when={session()?.data && isEngine() && !linkPending()}
									fallback={
										<Show
											when={!isSubmitted() && !linkPending()}
											fallback={
												<div class="border-l-4 border-information pl-5">
													<div class="flex size-11 items-center justify-center rounded-md border border-information/35 bg-information/10 text-information">
														<Mail class="size-5" aria-hidden="true" />
													</div>
													<h1 class="mt-6 font-display text-4xl font-semibold">
														{linkPending()
															? m.auth_link_pending_title()
															: m.auth_check_email_title()}
													</h1>
													<p class="mt-3 leading-relaxed text-muted-foreground">
														{linkPending()
															? m.auth_link_pending_description()
															: m.auth_check_email_description({
																	email: submittedEmail()
																})}
													</p>
													<a
														href="/signin"
														class="mt-8 inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
													>
														{m.auth_back_sign_in()}
													</a>
												</div>
											}
										>
											<SignUpForm
												onSubmitted={(email) => {
													setSubmittedEmail(email);
													setIsSubmitted(true);
												}}
											/>
										</Show>
									}
								>
									<div
										role="status"
										class="border-l-4 border-information bg-information/5 p-6"
									>
										<h1 class="font-display text-3xl font-semibold">
											{m.device_link_title()}
										</h1>
										<p class="mt-3 text-sm leading-relaxed text-muted-foreground">
											{m.device_link_from_desktop()}
										</p>
										<a
											href="/connect"
											class="mt-5 inline-flex min-h-11 items-center rounded-md bg-foreground px-4 font-medium text-background"
										>
											{m.device_link_title()}
										</a>
										<button
											type="button"
											class="mt-3 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
											onClick={() => void linkEngine()}
										>
											{m.pro_activation_open()}
										</button>
									</div>
								</Show>
							}
						>
							<div role="alert" class="border-l-4 border-danger bg-danger/5 p-6">
								<h1 class="font-display text-3xl font-semibold">
									{m.auth_link_error()}
								</h1>
								<p class="mt-3 text-sm leading-relaxed text-muted-foreground">
									{m.pro_activation_error_detail()}
								</p>
								<button
									type="button"
									class="mt-5 inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium hover:bg-accent"
									onClick={() => {
										linkPromise = null;
										setLinkError(false);
										void linkEngine();
									}}
								>
									{m.checkout_activation_retry()}
								</button>
							</div>
						</Show>
					</div>
				</main>
			</div>
		</>
	);
}
