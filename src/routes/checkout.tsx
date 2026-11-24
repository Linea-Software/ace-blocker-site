import type { JSX } from '@solidjs/web';
import { Errored } from 'solid-js';
import { useLocation } from '@solidjs/router';
import { Meta, Title } from '@solidjs/meta';
import Navbar from '$lib/components/Navbar';
import MarketingFooter from '$lib/components/marketing/MarketingFooter';
import * as m from '$lib/paraglide/messages';

/** Checkout-scoped recovery UI, migrated from SvelteKit +error.svelte. */
export default function CheckoutLayout(props: { children: JSX.Element }) {
	const location = useLocation();
	return (
		<Errored
			fallback={(error, reset) => (
				<>
					<Title>{m.inline_checkout_unavailable_title()}</Title>
					<Meta name="robots" content="noindex, nofollow" />
					<Navbar isPro={false} />
					<main id="main-content" class="ace-shell min-h-[55vh] py-16 sm:py-24">
						<div class="max-w-xl border-l-4 border-signal pl-6">
							<p class="font-mono text-xs text-muted-foreground">
								{'status' in error ? String(error.status) : '500'}
							</p>
							<h1 class="mt-3 font-display text-4xl font-semibold">
								{m.inline_checkout_unavailable_title()}
							</h1>
							<p class="mt-4 text-muted-foreground">
								{m.inline_checkout_unavailable_body()}
							</p>
							<div class="mt-8 flex flex-wrap gap-3">
								<a
									href={location.pathname + location.search}
									onClick={() => reset()}
									class="inline-flex min-h-11 items-center rounded-md bg-foreground px-5 font-medium text-background"
								>
									{m.inline_checkout_retry()}
								</a>
								<a
									href="/get-pro"
									class="inline-flex min-h-11 items-center rounded-md border border-border px-5 font-medium"
								>
									{m.inline_checkout_back()}
								</a>
							</div>
						</div>
					</main>
					<MarketingFooter />
				</>
			)}
		>
			{props.children}
		</Errored>
	);
}
