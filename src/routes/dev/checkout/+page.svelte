<script lang="ts">
	import { authClient } from '$lib/auth-client';

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

<div class="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
	<h1 class="text-2xl font-bold">Dev Checkout Test</h1>
	
	<button
		onclick={handleCheckout}
		disabled={loading}
		class="rounded bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
	>
		{loading ? 'Generating Session...' : 'Open Checkout in New Tab'}
	</button>

	{#if error}
		<div class="rounded bg-red-100 p-3 text-red-500 border border-red-200">
			{error}
		</div>
	{/if}
</div>
