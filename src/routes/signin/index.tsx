import { createSignal, Show } from 'solid-js';
import { useLocation, useNavigate } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { CheckCircle2, Loader2 } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import { localizeHref } from '$lib/paraglide/runtime';
import { deliverApiKeyToEngine } from '$lib/utils/engine-link';
import AuthBrandedPanel from '$lib/components/AuthBrandedPanel';
import AuthMobileHeader from '$lib/components/AuthMobileHeader';
import AuthTopBar from '$lib/components/AuthTopBar';
import { AuthAlert, AuthLabel, inputClass, primaryButtonClass } from '$lib/components/AuthFields';
import OtpStep from './_components/OtpStep';

import { allowedAuthReturn } from '$lib/utils/auth-return';

export default function SignInPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const session = authClient.useSession();
	const [email, setEmail] = createSignal('');
	const [password, setPassword] = createSignal('');
	const [otpCode, setOtpCode] = createSignal('');
	const [error, setError] = createSignal<string | null>(null);
	const [loading, setLoading] = createSignal(false);
	const [linkAttempted, setLinkAttempted] = createSignal(false);
	const [linkPending, setLinkPending] = createSignal(false);
	const [step, setStep] = createSignal<'credentials' | 'otp'>('credentials');
	const param = (name: string) => new URLSearchParams(location.search).get(name);
	const origin = () => param('origin');
	const isEngine = () => origin() === 'ace-engine' || origin() === 'aceblocker';
	const checkoutReturn = () => allowedAuthReturn(param('redirectTo'));
	const resetSuccess = () => param('reset') === 'success';

	async function finishSignIn() {
		setLoading(false);
		if (checkoutReturn()) {
			navigate(checkoutReturn()!);
			return;
		}
		if (!isEngine()) navigate(localizeHref('/'));
	}
	async function linkEngine() {
		if (linkAttempted()) return;
		setLinkAttempted(true);
		setLoading(true);
		setError(null);
		try {
			// This legacy deep-link requires an explicit human click, never an effect.
			await deliverApiKeyToEngine();
			setLinkPending(true);
		} catch {
			setError(m.auth_link_error());
			setLinkAttempted(false);
		} finally {
			setLoading(false);
		}
	}
	async function handleSignIn(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		setLoading(true);
		setError(null);
		try {
			const result = await authClient.signIn.email({
				email: email(),
				password: password(),
				callbackURL: '/'
			});
			if (result.error) {
				setError(result.error.message ?? m.auth_error_generic());
				setLoading(false);
				return;
			}
			if ((result.data as { twoFactorRedirect?: boolean } | null)?.twoFactorRedirect) {
				setStep('otp');
				const sent = await authClient.twoFactor.sendOtp();
				if (sent.error) setError(sent.error.message ?? m.auth_error_generic());
				setLoading(false);
			} else await finishSignIn();
		} catch {
			setError(m.auth_error_generic());
			setLoading(false);
		}
	}
	async function handleVerifyOtp(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		setLoading(true);
		setError(null);
		try {
			const result = await authClient.twoFactor.verifyOtp({ code: otpCode() });
			if (result.error) {
				setError(result.error.message ?? m.auth_error_generic());
				setLoading(false);
				return;
			}
			await finishSignIn();
		} catch {
			setError(m.auth_error_generic());
			setLoading(false);
		}
	}
	function backToCredentials() {
		setStep('credentials');
		setError(null);
		setOtpCode('');
	}

	return (
		<>
			<Title>{m.page_title_sign_in()}</Title>
			<Meta name="description" content={m.auth_sign_in_description()} />
			<Meta property="og:title" content={m.page_title_sign_in()} />
			<Meta property="og:description" content={m.auth_sign_in_description()} />
			<Meta name="twitter:title" content={m.page_title_sign_in()} />
			<Meta name="twitter:description" content={m.auth_sign_in_description()} />
			<div class="flex min-h-screen w-full bg-background text-foreground">
				<AuthBrandedPanel />
				<main class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2">
					<AuthMobileHeader switchHref="/signup" switchLabel={m.auth_sign_up_button()} />
					<Show when={!origin()}>
						<AuthTopBar backLabel={m.auth_back_home()} />
					</Show>
					<div class="w-full max-w-md">
						<Show
							when={linkPending()}
							fallback={
								<Show
									when={session()?.data && isEngine()}
									fallback={
										<Show
											when={step() === 'credentials'}
											fallback={
												<OtpStep
													code={otpCode()}
													setCode={setOtpCode}
													error={error()}
													loading={loading()}
													onVerify={handleVerifyOtp}
													onBack={backToCredentials}
												/>
											}
										>
											<header class="mb-8">
												<h1 class="font-display text-4xl font-semibold">
													{m.auth_sign_in_title()}
												</h1>
												<p class="mt-2 text-muted-foreground">
													{m.auth_sign_in_description()}
												</p>
											</header>
											<Show when={error()}>
												<AuthAlert
													title={m.auth_error_title()}
													message={error()!}
												/>
											</Show>
											<Show when={resetSuccess()}>
												<div
													role="status"
													class="mb-6 flex items-center gap-3 rounded-md border border-success/40 bg-success/10 p-4 text-sm"
												>
													<CheckCircle2
														class="size-4 text-success"
														aria-hidden="true"
													/>
													{m.auth_reset_success()}
												</div>
											</Show>
											<form
												method="post"
												onSubmit={handleSignIn}
												class="space-y-5"
											>
												<div class="space-y-2">
													<AuthLabel for="email">
														{m.auth_email_label()}
													</AuthLabel>
													<input
														class={inputClass + ' h-11'}
														id="email"
														name="email"
														type="email"
														spellcheck={false}
														autocomplete="email"
														placeholder={m.auth_email_placeholder()}
														value={email()}
														onInput={(e) =>
															setEmail(e.currentTarget.value)
														}
														required
													/>
												</div>
												<div class="space-y-2">
													<div class="flex items-center justify-between gap-4">
														<AuthLabel for="password">
															{m.auth_password_label()}
														</AuthLabel>
														<a
															href="/forgot-password"
															class="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
														>
															{m.auth_forgot_password()}
														</a>
													</div>
													<input
														class={inputClass + ' h-11'}
														id="password"
														name="password"
														type="password"
														autocomplete="current-password"
														placeholder="••••••••"
														value={password()}
														onInput={(e) =>
															setPassword(e.currentTarget.value)
														}
														required
													/>
												</div>
												<button
													type="submit"
													class={primaryButtonClass + ' h-12 w-full'}
													disabled={loading()}
												>
													<Show when={loading()}>
														<Loader2
															class="size-4 animate-spin"
															aria-hidden="true"
														/>
													</Show>
													{loading()
														? m.auth_signing_in()
														: m.auth_sign_in_button()}
												</button>
											</form>
											<p class="mt-8 text-center text-sm text-muted-foreground">
												{m.auth_don_t_have_account()}{' '}
												<a
													href="/signup"
													class="ml-1 inline-flex min-h-11 items-center font-medium text-foreground hover:underline"
												>
													{m.auth_sign_up_button()}
												</a>
											</p>
										</Show>
									}
								>
									<div
										class="border-l-4 border-information bg-information/5 p-6"
										role="status"
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
											disabled={loading()}
											onClick={() => void linkEngine()}
											class="mt-3 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-50"
										>
											{m.pro_activation_open()}
										</button>
										<Show when={error()}>
											<p role="alert" class="mt-3 text-sm text-danger">
												{error()}
											</p>
										</Show>
									</div>
								</Show>
							}
						>
							<div
								class="border-l-4 border-information bg-information/5 p-6"
								role="status"
							>
								<CheckCircle2 class="size-6 text-information" aria-hidden="true" />
								<h1 class="mt-4 font-display text-3xl font-semibold">
									{m.auth_link_pending_title()}
								</h1>
								<p class="mt-3 leading-relaxed text-muted-foreground">
									{m.auth_link_pending_description()}
								</p>
							</div>
						</Show>
					</div>
				</main>
			</div>
		</>
	);
}
