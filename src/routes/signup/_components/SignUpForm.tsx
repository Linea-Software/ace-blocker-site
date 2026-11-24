import { createMemo, createSignal, Show } from 'solid-js';
import { CheckCircle2, Loader2 } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import { AuthAlert, AuthLabel, inputClass, primaryButtonClass } from '$lib/components/AuthFields';

export default function SignUpForm(props: { onSubmitted: (email: string) => void }) {
	const [name, setName] = createSignal('');
	const [email, setEmail] = createSignal('');
	const [password, setPassword] = createSignal('');
	const [confirmPassword, setConfirmPassword] = createSignal('');
	const [error, setError] = createSignal<string | null>(null);
	const [loading, setLoading] = createSignal(false);
	const passwordsMatch = createMemo(
		() => password().length > 0 && password() === confirmPassword()
	);
	async function handleSignUp(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		if (!passwordsMatch()) {
			setError(m.auth_passwords_do_not_match());
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const result = await authClient.signUp.email({
				email: email(),
				password: password(),
				name: name(),
				callbackURL: '/'
			});
			if (result.error) {
				setError(result.error.message ?? m.auth_error_generic());
				return;
			}
			props.onSubmitted(email());
			setPassword('');
			setConfirmPassword('');
		} catch {
			setError(m.auth_error_generic());
		} finally {
			setLoading(false);
		}
	}
	return (
		<>
			<header class="mb-8">
				<h1 class="font-display text-4xl font-semibold">{m.auth_sign_up_title()}</h1>
				<p class="mt-2 text-muted-foreground">{m.auth_sign_up_description()}</p>
			</header>
			<Show when={error()}>
				<AuthAlert message={error()!} />
			</Show>
			<form method="post" onSubmit={handleSignUp} class="space-y-5">
				<div class="space-y-2">
					<AuthLabel for="name">{m.auth_name_label()}</AuthLabel>
					<input
						class={inputClass + ' h-11'}
						id="name"
						name="name"
						type="text"
						autocomplete="name"
						placeholder={m.auth_name_placeholder()}
						value={name()}
						onInput={(e) => setName(e.currentTarget.value)}
						required
					/>
				</div>
				<div class="space-y-2">
					<AuthLabel for="email">{m.auth_email_label()}</AuthLabel>
					<input
						class={inputClass + ' h-11'}
						id="email"
						name="email"
						type="email"
						spellcheck={false}
						autocomplete="email"
						placeholder={m.auth_email_placeholder()}
						value={email()}
						onInput={(e) => setEmail(e.currentTarget.value)}
						required
					/>
				</div>
				<div class="space-y-2">
					<AuthLabel for="password">{m.auth_password_label()}</AuthLabel>
					<input
						class={inputClass + ' h-11'}
						id="password"
						name="password"
						type="password"
						autocomplete="new-password"
						placeholder="••••••••"
						value={password()}
						onInput={(e) => setPassword(e.currentTarget.value)}
						required
					/>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between gap-4">
						<AuthLabel for="confirm-password">
							{m.auth_confirm_password_label()}
						</AuthLabel>
						<Show when={confirmPassword()}>
							<span
								class={
									passwordsMatch()
										? 'flex items-center gap-1 text-xs font-medium text-success'
										: 'text-xs font-medium text-danger'
								}
							>
								<Show when={passwordsMatch()}>
									<CheckCircle2 class="size-3.5" aria-hidden="true" />
								</Show>
								{passwordsMatch()
									? m.auth_password_match()
									: m.auth_password_no_match()}
							</span>
						</Show>
					</div>
					<input
						class={
							inputClass +
							' h-11' +
							(confirmPassword() && !passwordsMatch() ? ' border-danger' : '')
						}
						id="confirm-password"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						placeholder="••••••••"
						value={confirmPassword()}
						onInput={(e) => setConfirmPassword(e.currentTarget.value)}
						required
						aria-invalid={
							Boolean(confirmPassword()) && !passwordsMatch() ? 'true' : 'false'
						}
					/>
				</div>
				<button
					class={primaryButtonClass + ' mt-2 h-12 w-full'}
					type="submit"
					disabled={loading()}
				>
					<Show when={loading()}>
						<Loader2 class="size-4 animate-spin" aria-hidden="true" />
					</Show>
					{loading() ? m.auth_signing_up() : m.auth_sign_up_button()}
				</button>
			</form>
			<p class="mt-8 text-center text-sm text-muted-foreground">
				{m.auth_already_have_account()}{' '}
				<a href="/signin" class="ml-1 font-medium text-foreground hover:underline">
					{m.auth_sign_in_button()}
				</a>
			</p>
		</>
	);
}
