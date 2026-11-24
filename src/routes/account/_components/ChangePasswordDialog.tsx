import { createEffect, createSignal, Show } from 'solid-js';
import { Eye, EyeOff, Loader2 } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
import { AuthLabel, inputClass } from '$lib/components/AuthFields';
import DialogShell, { type Notify } from './DialogShell';

export default function ChangePasswordDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	notify: Notify;
}) {
	const [currentPassword, setCurrentPassword] = createSignal('');
	const [newPassword, setNewPassword] = createSignal('');
	const [confirmPassword, setConfirmPassword] = createSignal('');
	const [showPasswords, setShowPasswords] = createSignal(false);
	const [loading, setLoading] = createSignal(false);
	const [error, setError] = createSignal<string | null>(null);
	createEffect(
		() => props.open,
		(open) => {
			if (!open) return;
			setError(null);
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			setShowPasswords(false);
		}
	);
	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (loading()) return;
		if (newPassword() !== confirmPassword()) {
			setError(m.account_passwords_do_not_match());
			return;
		}
		setLoading(true);
		setError(null);
		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword: currentPassword(),
					newPassword: newPassword()
				}),
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Password change rejected');
			props.notify(m.account_password_changed(), 'success');
			setCurrentPassword('');
			setNewPassword('');
			setConfirmPassword('');
			props.onOpenChange(false);
		} catch {
			setError(m.account_password_error());
		} finally {
			setLoading(false);
		}
	}
	const passwordType = () => (showPasswords() ? 'text' : 'password');
	return (
		<DialogShell
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={m.account_change_password_title()}
			description={m.account_change_password_description()}
			class="sm:max-w-lg"
		>
			<form onSubmit={handleSubmit}>
				<div class="flex flex-col gap-4 py-4">
					<div class="flex justify-end">
						<button
							type="button"
							aria-pressed={showPasswords() ? 'true' : 'false'}
							onClick={() => setShowPasswords((v) => !v)}
							class="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent"
						>
							<Show
								when={showPasswords()}
								fallback={<Eye class="size-4" aria-hidden="true" />}
							>
								<EyeOff class="size-4" aria-hidden="true" />
							</Show>
							{showPasswords()
								? m.account_hide_passwords()
								: m.account_show_passwords()}
						</button>
					</div>
					<div class="flex flex-col gap-1.5">
						<AuthLabel
							for="modal-current-password"
							class="text-xs text-muted-foreground"
						>
							{m.account_current_password_label()}
						</AuthLabel>
						<input
							id="modal-current-password"
							type={passwordType()}
							value={currentPassword()}
							onInput={(e) => setCurrentPassword(e.currentTarget.value)}
							autocomplete="current-password"
							required
							aria-invalid={error() ? 'true' : 'false'}
							aria-describedby={error() ? 'password-form-error' : undefined}
							class={inputClass}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<AuthLabel for="modal-new-password" class="text-xs text-muted-foreground">
							{m.account_new_password_label()}
						</AuthLabel>
						<input
							id="modal-new-password"
							type={passwordType()}
							value={newPassword()}
							onInput={(e) => setNewPassword(e.currentTarget.value)}
							autocomplete="new-password"
							required
							aria-invalid={error() ? 'true' : 'false'}
							aria-describedby={error() ? 'password-form-error' : undefined}
							class={inputClass}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<AuthLabel
							for="modal-confirm-password"
							class="text-xs text-muted-foreground"
						>
							{m.account_confirm_new_password_label()}
						</AuthLabel>
						<input
							id="modal-confirm-password"
							type={passwordType()}
							value={confirmPassword()}
							onInput={(e) => setConfirmPassword(e.currentTarget.value)}
							autocomplete="new-password"
							required
							aria-invalid={error() ? 'true' : 'false'}
							aria-describedby={error() ? 'password-form-error' : undefined}
							class={inputClass}
						/>
					</div>
					<Show when={error()}>
						<p id="password-form-error" class="text-sm text-destructive" role="alert">
							{error()}
						</p>
					</Show>
				</div>
				<div class="flex justify-end gap-2">
					<button
						type="button"
						class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
						onClick={() => props.onOpenChange(false)}
					>
						{m.account_cancel_action()}
					</button>
					<button
						type="submit"
						disabled={loading()}
						class="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
					>
						<Show when={loading()}>
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
						</Show>
						{m.account_change_password_button()}
					</button>
				</div>
			</form>
		</DialogShell>
	);
}
