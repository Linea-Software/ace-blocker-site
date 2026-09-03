<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2 } from '@lucide/svelte';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';

	let { open = $bindable(false), email }: { open?: boolean; email: string } = $props();

	let emailConfirm = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleDelete() {
		if (emailConfirm !== email) return;
		loading = true;
		error = null;

		try {
			const res = await fetch('/api/v1/account/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
				credentials: 'include'
			});

			if (!res.ok) {
				const body = await res.json();
				throw new Error(typeof body === 'string' ? body : 'Failed to delete account');
			}

			window.location.assign(`${resolve('/')}?deleted=true`);
		} catch {
			error = m.account_delete_error();
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title class="text-destructive">{m.account_delete_title()}</Dialog.Title>
			<Dialog.Description>{m.account_delete_warning()}</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			{#if error}
				<p id="delete-account-error" class="text-sm text-destructive" role="alert">
					{error}
				</p>
			{/if}
			<div>
				<Label for="delete-email-confirm" class="text-xs text-muted-foreground">
					{m.account_delete_email_confirm()}
				</Label>
				<Input
					id="delete-email-confirm"
					type="email"
					bind:value={emailConfirm}
					placeholder={email}
					aria-invalid={error ? 'true' : undefined}
					aria-describedby={error ? 'delete-account-error' : undefined}
					class="mt-1"
				/>
			</div>
		</div>
		<Dialog.Footer class="flex justify-end gap-2">
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					emailConfirm = '';
					error = null;
				}}>{m.account_cancel_action()}</Button
			>
			<Button
				variant="destructive"
				disabled={loading || emailConfirm !== email}
				onclick={handleDelete}
			>
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				{m.account_delete_button()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
