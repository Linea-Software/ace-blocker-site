<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Eye, EyeOff, Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let { open = $bindable(false) } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let showPasswords = $state(false);

	const visibilityLabel = $derived(
		showPasswords ? m.account_hide_passwords() : m.account_show_passwords()
	);

	async function handleSubmit(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		if (newPassword !== confirmPassword) {
			error = m.account_passwords_do_not_match();
			loading = false;
			return;
		}

		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword }),
				credentials: 'include'
			});

			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.message || 'Failed to change password');
			}

			toast.success(m.account_password_changed());
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			error = null;
			open = false;
		} catch {
			error = m.account_password_error();
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (isOpen) {
			error = null;
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			showPasswords = false;
		}
	}}
>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{m.account_change_password_title()}</Dialog.Title>
			<Dialog.Description>
				{m.account_change_password_description()}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={handleSubmit}>
			<div class="flex flex-col gap-4 py-4">
				<div class="flex justify-end">
					<Button
						variant="ghost"
						size="sm"
						type="button"
						aria-pressed={showPasswords}
						onclick={() => (showPasswords = !showPasswords)}
					>
						{#if showPasswords}
							<EyeOff data-icon="inline-start" aria-hidden="true" />
						{:else}
							<Eye data-icon="inline-start" aria-hidden="true" />
						{/if}
						{visibilityLabel}
					</Button>
				</div>
				<div class="flex flex-col gap-1.5">
					<Label for="modal-current-password" class="text-xs text-muted-foreground">
						{m.account_current_password_label()}
					</Label>
					<Input
						id="modal-current-password"
						type={showPasswords ? 'text' : 'password'}
						bind:value={currentPassword}
						required
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={error ? 'password-form-error' : undefined}
					/>
				</div>
				<div class="flex flex-col gap-4">
					<div class="flex flex-col gap-1.5">
						<Label for="modal-new-password" class="text-xs text-muted-foreground">
							{m.account_new_password_label()}
						</Label>
						<Input
							id="modal-new-password"
							type={showPasswords ? 'text' : 'password'}
							bind:value={newPassword}
							required
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'password-form-error' : undefined}
						/>
					</div>
					<div class="flex flex-col gap-1.5">
						<Label for="modal-confirm-password" class="text-xs text-muted-foreground">
							{m.account_confirm_new_password_label()}
						</Label>
						<Input
							id="modal-confirm-password"
							type={showPasswords ? 'text' : 'password'}
							bind:value={confirmPassword}
							required
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'password-form-error' : undefined}
						/>
					</div>
				</div>
				{#if error}
					<p id="password-form-error" class="text-sm text-destructive" role="alert">
						{error}
					</p>
				{/if}
			</div>
			<Dialog.Footer class="flex justify-end gap-2">
				<Button variant="outline" type="button" onclick={() => (open = false)}
					>{m.account_cancel_action()}</Button
				>
				<Button type="submit" disabled={loading}>
					{#if loading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					{m.account_change_password_button()}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
