<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let { open = $bindable(false) } = $props();

	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

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
		}
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.account_change_password_title()}</Dialog.Title>
			<Dialog.Description>
				{m.account_change_password_description()}
			</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={handleSubmit}>
			<div class="space-y-4 py-4">
				<div>
					<Label for="modal-current-password" class="text-xs text-muted-foreground">
						{m.account_current_password_label()}
					</Label>
					<Input
						id="modal-current-password"
						type="password"
						bind:value={currentPassword}
						required
						aria-invalid={error ? 'true' : undefined}
						aria-describedby={error ? 'password-form-error' : undefined}
						class="mt-1"
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<Label for="modal-new-password" class="text-xs text-muted-foreground">
							{m.account_new_password_label()}
						</Label>
						<Input
							id="modal-new-password"
							type="password"
							bind:value={newPassword}
							required
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'password-form-error' : undefined}
							class="mt-1"
						/>
					</div>
					<div>
						<Label for="modal-confirm-password" class="text-xs text-muted-foreground">
							{m.account_confirm_new_password_label()}
						</Label>
						<Input
							id="modal-confirm-password"
							type="password"
							bind:value={confirmPassword}
							required
							aria-invalid={error ? 'true' : undefined}
							aria-describedby={error ? 'password-form-error' : undefined}
							class="mt-1"
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
