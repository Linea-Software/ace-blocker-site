import { createSignal, Show } from 'solid-js';
import { Loader2 } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
import { AuthLabel, inputClass } from '$lib/components/AuthFields';
import DialogShell from './DialogShell';

export default function DeleteAccountDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	email: string;
}) {
	const [emailConfirm, setEmailConfirm] = createSignal('');
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	function close() {
		props.onOpenChange(false);
		setEmailConfirm('');
		setError(null);
	}
	async function handleDelete() {
		if (loading() || emailConfirm() !== props.email) return;
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/v1/account/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: props.email }),
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Account deletion rejected');
			// Full navigation discards the authenticated client session and cached account data.
			window.location.assign('/?deleted=true');
		} catch {
			setError(m.account_delete_error());
		} finally {
			setLoading(false);
		}
	}
	return (
		<DialogShell
			open={props.open}
			onOpenChange={(isOpen) => (isOpen ? props.onOpenChange(true) : close())}
			title={m.account_delete_title()}
			description={m.account_delete_warning()}
			danger
		>
			<div class="space-y-4 py-4">
				<Show when={error()}>
					<p id="delete-account-error" class="text-sm text-destructive" role="alert">
						{error()}
					</p>
				</Show>
				<div>
					<AuthLabel for="delete-email-confirm" class="text-xs text-muted-foreground">
						{m.account_delete_email_confirm()}
					</AuthLabel>
					<input
						id="delete-email-confirm"
						type="email"
						value={emailConfirm()}
						onInput={(e) => setEmailConfirm(e.currentTarget.value)}
						placeholder={props.email}
						aria-invalid={error() ? 'true' : 'false'}
						aria-describedby={error() ? 'delete-account-error' : undefined}
						class={inputClass + ' mt-1'}
					/>
				</div>
			</div>
			<div class="flex justify-end gap-2">
				<button
					type="button"
					class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
					onClick={close}
				>
					{m.account_cancel_action()}
				</button>
				<button
					type="button"
					class="text-destructive-foreground inline-flex min-h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium disabled:opacity-50"
					disabled={loading() || emailConfirm() !== props.email}
					onClick={() => void handleDelete()}
				>
					<Show when={loading()}>
						<Loader2 class="size-4 animate-spin" aria-hidden="true" />
					</Show>
					{m.account_delete_button()}
				</button>
			</div>
		</DialogShell>
	);
}
