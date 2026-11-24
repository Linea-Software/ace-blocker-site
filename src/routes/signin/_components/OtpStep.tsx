import { Show } from 'solid-js';
import { ArrowLeft, Key, Loader2 } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
import { AuthAlert, AuthLabel, inputClass, primaryButtonClass } from '$lib/components/AuthFields';

export default function OtpStep(props: {
	code: string;
	setCode: (code: string) => void;
	error: string | null;
	loading: boolean;
	onVerify: (e: SubmitEvent) => void;
	onBack: () => void;
}) {
	return (
		<>
			<header class="mb-8">
				<h1 class="font-display text-4xl font-semibold">{m.auth_2fa_title()}</h1>
				<p class="mt-2 text-muted-foreground">{m.auth_2fa_description()}</p>
			</header>
			<Show when={props.error}>
				<AuthAlert message={props.error!} />
			</Show>
			<form method="post" onSubmit={props.onVerify} class="space-y-5">
				<div class="space-y-2">
					<AuthLabel for="otp">{m.auth_verification_code_label()}</AuthLabel>
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
							value={props.code}
							onInput={(e) => props.setCode(e.currentTarget.value)}
							required
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
				<button
					type="submit"
					class={primaryButtonClass + ' h-12 w-full'}
					disabled={props.loading}
				>
					<Show when={props.loading}>
						<Loader2 class="size-4 animate-spin" aria-hidden="true" />
					</Show>
					{props.loading ? m.auth_verifying_code() : m.auth_verify_code()}
				</button>
				<button
					type="button"
					class="flex min-h-11 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-muted-foreground hover:bg-accent"
					onClick={props.onBack}
				>
					<ArrowLeft class="size-4" aria-hidden="true" />
					{m.auth_back_login()}
				</button>
			</form>
		</>
	);
}
