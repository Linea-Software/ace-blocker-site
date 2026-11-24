import { createSignal, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Title, Meta } from '@solidjs/meta';
import { ArrowLeft, Key, Loader2, Lock, Mail } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import AuthBrandedPanel from '$lib/components/AuthBrandedPanel';
import AuthMobileHeader from '$lib/components/AuthMobileHeader';
import AuthTopBar from '$lib/components/AuthTopBar';
import { AuthAlert, AuthLabel, inputClass, primaryButtonClass } from '$lib/components/AuthFields';

export default function ForgotPasswordPage() {
	const navigate = useNavigate();
	const [email, setEmail] = createSignal('');
	const [otp, setOtp] = createSignal('');
	const [newPassword, setNewPassword] = createSignal('');
	const [confirmPassword, setConfirmPassword] = createSignal('');
	const [error, setError] = createSignal<string | null>(null);
	const [loading, setLoading] = createSignal(false);
	const [step, setStep] = createSignal<'email' | 'reset'>('email');

	async function handleRequestReset(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		setLoading(true);
		setError(null);
		try {
			const result = await authClient.emailOtp.requestPasswordReset({ email: email() });
			if (result.error) {
				setError(result.error.message || m.auth_reset_send_error());
				return;
			}
			setStep('reset');
		} catch {
			setError(m.auth_reset_send_error());
		} finally {
			setLoading(false);
		}
	}
	async function handleResetPassword(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		if (newPassword() !== confirmPassword()) {
			setError(m.auth_passwords_do_not_match());
			return;
		}
		if (newPassword().length < 8) {
			setError(m.auth_password_min_length());
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const result = await authClient.emailOtp.resetPassword({
				email: email(),
				otp: otp(),
				password: newPassword()
			});
			if (result.error) {
				setError(result.error.message || m.auth_reset_failed());
				return;
			}
			setNewPassword('');
			setConfirmPassword('');
			setOtp('');
			navigate('/signin?reset=success');
		} catch {
			setError(m.auth_reset_failed());
		} finally {
			setLoading(false);
		}
	}
	function backToEmail() {
		setStep('email');
		setError(null);
		setOtp('');
		setNewPassword('');
		setConfirmPassword('');
	}
	return (
		<>
			<Title>{m.page_title_forgot_password()}</Title>
			<Meta name="description" content={m.page_description_forgot_password()} />
			<Meta property="og:title" content={m.page_title_forgot_password()} />
			<Meta property="og:description" content={m.page_description_forgot_password()} />
			<Meta name="twitter:title" content={m.page_title_forgot_password()} />
			<Meta name="twitter:description" content={m.page_description_forgot_password()} />
			<div class="flex min-h-screen w-full bg-background text-foreground">
				<AuthBrandedPanel />
				<main class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2">
					<AuthMobileHeader switchHref="/signin" switchLabel={m.auth_sign_in_button()} />
					<AuthTopBar backHref="/signin" backLabel={m.auth_back_sign_in()} />
					<div class="w-full max-w-md">
						<Show
							when={step() === 'email'}
							fallback={
								<>
									<header class="mb-8">
										<h1 class="font-display text-4xl font-semibold">
											{m.auth_set_new_password_title()}
										</h1>
										<p class="mt-2 text-muted-foreground">
											{m.auth_set_new_password_description({
												email: email()
											})}
										</p>
									</header>
									<Show when={error()}>
										<AuthAlert message={error()!} />
									</Show>
									<form
										method="post"
										onSubmit={handleResetPassword}
										class="space-y-5"
									>
										<div class="space-y-2">
											<AuthLabel for="otp">
												{m.auth_verification_code_label()}
											</AuthLabel>
											<div class="relative">
												<input
													id="otp"
													name="otp"
													type="text"
													spellcheck={false}
													inputmode="numeric"
													autocomplete="one-time-code"
													placeholder="000000"
													pattern="\d*"
													minlength={6}
													maxlength={6}
													required
													value={otp()}
													onInput={(e) => setOtp(e.currentTarget.value)}
													class={
														inputClass +
														' h-14 pl-11 text-center font-mono text-2xl tracking-[0.35em]'
													}
												/>
												<Key
													class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
													aria-hidden="true"
												/>
											</div>
										</div>
										<div class="space-y-2">
											<AuthLabel for="new-password">
												{m.auth_new_password_label()}
											</AuthLabel>
											<div class="relative">
												<input
													id="new-password"
													name="newPassword"
													type="password"
													autocomplete="new-password"
													placeholder="••••••••"
													required
													minlength={8}
													value={newPassword()}
													onInput={(e) =>
														setNewPassword(e.currentTarget.value)
													}
													class={inputClass + ' h-11 pl-10'}
												/>
												<Lock
													class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
													aria-hidden="true"
												/>
											</div>
										</div>
										<div class="space-y-2">
											<AuthLabel for="confirm-password">
												{m.auth_confirm_password_label()}
											</AuthLabel>
											<div class="relative">
												<input
													id="confirm-password"
													name="confirmPassword"
													type="password"
													autocomplete="new-password"
													placeholder="••••••••"
													required
													minlength={8}
													value={confirmPassword()}
													onInput={(e) =>
														setConfirmPassword(e.currentTarget.value)
													}
													class={inputClass + ' h-11 pl-10'}
												/>
												<Lock
													class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
													aria-hidden="true"
												/>
											</div>
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
											{loading() ? m.auth_resetting() : m.auth_reset_button()}
										</button>
										<button
											type="button"
											class="flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted-foreground hover:bg-accent"
											onClick={backToEmail}
										>
											<ArrowLeft class="size-4" aria-hidden="true" />
											{m.auth_back_email()}
										</button>
									</form>
								</>
							}
						>
							<>
								<header class="mb-8">
									<h1 class="font-display text-4xl font-semibold">
										{m.auth_reset_title()}
									</h1>
									<p class="mt-2 text-muted-foreground">
										{m.auth_reset_description()}
									</p>
								</header>
								<Show when={error()}>
									<AuthAlert message={error()!} />
								</Show>
								<form method="post" onSubmit={handleRequestReset} class="space-y-5">
									<div class="space-y-2">
										<AuthLabel for="email">{m.auth_email_label()}</AuthLabel>
										<div class="relative">
											<input
												id="email"
												name="email"
												type="email"
												spellcheck={false}
												autocomplete="email"
												placeholder={m.auth_email_placeholder()}
												value={email()}
												onInput={(e) => setEmail(e.currentTarget.value)}
												required
												class={inputClass + ' h-11 pl-10'}
											/>
											<Mail
												class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
												aria-hidden="true"
											/>
										</div>
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
										{loading() ? m.auth_sending_code() : m.auth_send_code()}
									</button>
								</form>
							</>
						</Show>
					</div>
				</main>
			</div>
		</>
	);
}
