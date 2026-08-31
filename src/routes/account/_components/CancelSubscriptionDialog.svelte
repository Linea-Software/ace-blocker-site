<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let { open = $bindable(false) } = $props();

	let loading = $state(false);
	let countdown = $state(0);
	let countdownTimer: ReturnType<typeof setInterval> | null = $state(null);

	function startCountdown() {
		countdown = 5;
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = setInterval(() => {
			countdown -= 1;
			if (countdown <= 0) {
				if (countdownTimer) clearInterval(countdownTimer);
				countdownTimer = null;
			}
		}, 1000);
	}

	function stopCountdown() {
		countdown = 0;
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = null;
	}

	async function handleCancel() {
		loading = true;
		try {
			const res = await fetch('/api/v1/account/cancel-subscription', {
				method: 'POST',
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Failed to cancel');

			toast.success(m.account_cancel_success());
			open = false;
			stopCountdown();
		} catch (err: any) {
			toast.error(m.account_cancel_error());
		} finally {
			loading = false;
		}
	}
</script>

<Dialog.Root
	bind:open
	onOpenChange={(isOpen) => {
		if (isOpen) startCountdown();
		else stopCountdown();
	}}
>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{m.account_cancel_title()}</Dialog.Title>
			<Dialog.Description>{m.account_cancel_description()}</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer class="flex justify-end gap-2">
			<Button
				variant="outline"
				onclick={() => {
					open = false;
					stopCountdown();
				}}>Cancel</Button
			>
			<Button
				variant="destructive"
				disabled={loading || countdown > 0}
				onclick={handleCancel}
			>
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{m.account_cancel_confirm()}
				{:else if countdown > 0}
					{m.account_cancel_confirm()} ({countdown}s)
				{:else}
					{m.account_cancel_confirm()}
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
