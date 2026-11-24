import { createSignal, Show } from 'solid-js';
import { Loader2 } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages.js';
import DialogShell, { type Notify } from './DialogShell';

export default function Disable2FADialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	notify: Notify;
	onChanged: () => void;
}) {
	const [password, setPassword] = createSignal('');
	const [loading, setLoading] = createSignal(false);
	function close() {
		setPassword('');
		props.onOpenChange(false);
	}
	async function handleDisable(event: SubmitEvent) {
		event.preventDefault();
		if (loading() || !password()) return;
		setLoading(true);
		try {
			const result = await authClient.twoFactor.disable({ password: password() });
			if (result.error) throw new Error(result.error.message);
			props.notify(m.account_2fa_disabled(), 'success');
			close();
			props.onChanged();
		} catch {
			props.notify(m.account_2fa_disable_error(), 'error');
		} finally {
			setLoading(false);
			setPassword('');
		}
	}
	return (
		<DialogShell
			open={props.open}
			onOpenChange={close}
			title={m.account_disable_2fa()}
			description={m.account_disable_2fa_confirm()}
		>
			<form onSubmit={(event) => void handleDisable(event)}>
				<label for="disable-2fa-password" class="mb-2 block text-sm font-medium">
					{m.account_current_password_label()}
				</label>
				<input
					id="disable-2fa-password"
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
						disabled={loading()}
						class="text-destructive-foreground inline-flex min-h-10 items-center gap-2 rounded-md bg-destructive px-4 disabled:opacity-50"
					>
						<Show when={loading()}>
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
						</Show>
						{m.account_disable_2fa()}
					</button>
				</div>
			</form>
		</DialogShell>
	);
}
