<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import { authClient } from '$lib/auth-client';
	import * as m from '$lib/paraglide/messages';

	let { open = $bindable(false) } = $props();

	let loading = $state(false);

	async function handleDisable() {
		loading = true;
		try {
			// @ts-expect-error - twoFactor client type might not match runtime
			await authClient.twoFactor.disable();
			toast.success(m.account_2fa_disabled());
			open = false;
		} catch {
			toast.error(m.account_2fa_disable_error());
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.account_disable_2fa()}</Dialog.Title>
			<Dialog.Description>{m.account_disable_2fa_confirm()}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => (open = false)}
				>{m.account_cancel_action()}</Button
			>
			<Button variant="destructive" disabled={loading} onclick={handleDisable}>
				{#if loading}
					<Loader2 class="h-4 w-4 animate-spin" />
				{/if}
				{m.account_disable_2fa()}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
