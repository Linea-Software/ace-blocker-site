import { createSignal, Show } from 'solid-js';
import { Loader2 } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import DialogShell, { type Notify } from './DialogShell';

/**
 * Better Auth requires a password before enabling a second factor.
 * Use the configured email OTP method, which matches Ace's existing login
 * challenge and requires no authenticator-app setup.
 */
export default function Enable2FADialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	notify: Notify;
	onChanged: () => void;
}) {
	const [password, setPassword] = createSignal('');
	const [busy, setBusy] = createSignal(false);
	function close() {
		setPassword('');
		props.onOpenChange(false);
	}
	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (busy() || !password()) return;
		setBusy(true);
		try {
			const result = await authClient.twoFactor.enable({
				password: password(),
				method: 'otp'
			});
			if (result.error) throw new Error(result.error.message);
			props.notify(m.account_2fa_check_email(), 'success');
			close();
			props.onChanged();
		} catch {
			props.notify(m.account_2fa_enable_error(), 'error');
		} finally {
			setBusy(false);
			setPassword('');
		}
	}
	return (
		<DialogShell
			open={props.open}
			onOpenChange={close}
			title={m.account_enable_2fa()}
			description={m.account_2fa_check_email()}
		>
			<form onSubmit={(event) => void submit(event)}>
				<label for="enable-2fa-password" class="mb-2 block text-sm font-medium">
					{m.account_current_password_label()}
				</label>
				<input
					id="enable-2fa-password"
					type="password"
					autocomplete="current-password"
					required
					value={password()}
					onInput={(event) => setPassword(event.currentTarget.value)}
					class="min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
				/>
				<div class="mt-6 flex justify-end gap-2">
					<button
						type="button"
						class="min-h-10 rounded-md border border-border px-4"
						onClick={close}
					>
						{m.account_cancel_action()}
					</button>
					<button
						type="submit"
						disabled={busy()}
						class="inline-flex min-h-10 items-center gap-2 rounded-md bg-foreground px-4 text-background disabled:opacity-50"
					>
						<Show when={busy()}>
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
						</Show>
						{m.account_enable_2fa()}
					</button>
				</div>
			</form>
		</DialogShell>
	);
}
