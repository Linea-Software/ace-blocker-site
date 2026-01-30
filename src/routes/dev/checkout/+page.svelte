<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, ExternalLink } from '@lucide/svelte';

	let loading = $state(false);
	let error = $state<string | null>(null);

	async function handleCheckout() {
		loading = true;
		error = null;
		try {
			const { data, error: err } = await authClient.dodopayments.checkoutSession({
				product_cart: [
					{
						product_id: 'pdt_0NXOnI40qSEVOqAnCUwmm', // Example product ID
						quantity: 1
					}
				],
				return_url: window.location.origin
			});

			if (err) {
				error = err.message || 'An error occurred';
				return;
			}

			if (data?.url) {
				window.open(data.url, '_blank');
			}
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header>
			<Card.Title class="text-2xl font-bold tracking-tight">Checkout Test</Card.Title>
			<Card.Description>Only available in development mode.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">
				Testing Dodo Payments integration with Better Auth. Clicking the button below will generate a
				checkout session and open it in a new tab.
			</p>

			{#if error}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleCheckout} disabled={loading} class="w-full">
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Generating Session...
				{:else}
					<ExternalLink class="mr-2 h-4 w-4" />
					Open Checkout
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
