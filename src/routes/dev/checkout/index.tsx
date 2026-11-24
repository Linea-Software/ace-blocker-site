import { createSignal, Show } from 'solid-js';
import { Title } from '@solidjs/meta';
import { AlertCircle, ExternalLink, Loader2 } from '@lucide/solid';
import { authClient } from '$lib/auth-client';
import * as m from '$lib/paraglide/messages';

const button =
	'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50';
export default function DevCheckoutPage() {
	const [loading, setLoading] = createSignal(false);
	const [failure, setFailure] = createSignal<string | null>(null);
	async function handleCheckout() {
		setLoading(true);
		setFailure(null);
		try {
			const { data, error } = await authClient.dodopayments.checkoutSession({
				product_cart: [{ product_id: 'pdt_0NXOnI40qSEVOqAnCUwmm', quantity: 1 }],
				return_url: window.location.origin
			});
			if (error) {
				setFailure(error.message || m.dev_checkout_error());
				return;
			}
			if (data?.url) window.open(data.url, '_blank', 'noopener,noreferrer');
		} catch (error) {
			setFailure(error instanceof Error ? error.message : m.dev_checkout_error());
		} finally {
			setLoading(false);
		}
	}
	return (
		<>
			<Title>{m.dev_checkout_page_title()}</Title>
			<div class="flex min-h-screen items-center justify-center bg-muted/40 p-4">
				<section class="w-full max-w-md rounded-lg border bg-card shadow-lg">
					<header class="p-6">
						<h1 class="text-2xl font-bold tracking-tight">{m.dev_checkout_title()}</h1>
						<p class="mt-2 text-sm text-muted-foreground">
							{m.dev_checkout_description()}
						</p>
					</header>
					<div class="space-y-4 px-6 pb-5">
						<p class="text-sm text-muted-foreground">{m.dev_checkout_body()}</p>
						<Show when={failure()}>
							<div
								role="alert"
								class="flex gap-2 rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive"
							>
								<AlertCircle class="size-4 shrink-0" />
								<div>
									<p class="font-semibold">{m.auth_error_generic()}</p>
									<p class="mt-1">{failure()}</p>
								</div>
							</div>
						</Show>
					</div>
					<footer class="px-6 pb-6">
						<button
							type="button"
							class={button}
							disabled={loading()}
							onClick={() => void handleCheckout()}
						>
							<Show
								when={loading()}
								fallback={
									<>
										<ExternalLink class="size-4" />
										{m.dev_checkout_open()}
									</>
								}
							>
								<Loader2 class="size-4 animate-spin" />
								{m.dev_checkout_generating()}
							</Show>
						</button>
					</footer>
				</section>
			</div>
		</>
	);
}
