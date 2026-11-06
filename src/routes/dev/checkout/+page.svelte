<script lang="ts">
	import * as m from '$lib/paraglide/messages';
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
				error = err.message || m.dev_checkout_error();
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

<svelte:head>
	<title>{m.dev_checkout_page_title()}</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header>
			<Card.Title class="text-2xl font-bold tracking-tight">{m.dev_checkout_title()}</Card.Title>
			<Card.Description>{m.dev_checkout_description()}</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<p class="text-sm text-muted-foreground">
				{m.dev_checkout_body()}
			</p>

			{#if error}
				<Alert.Root variant="destructive">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>{m.auth_error_generic()}</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
		</Card.Content>
		<Card.Footer>
			<Button onclick={handleCheckout} disabled={loading} class="w-full">
				{#if loading}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{m.dev_checkout_generating()}
				{:else}
					<ExternalLink class="mr-2 h-4 w-4" />
					{m.dev_checkout_open()}
				{/if}
			</Button>
		</Card.Footer>
	</Card.Root>
</div>
