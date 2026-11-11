<script lang="ts">
	import Navbar from '$lib/components/Navbar.svelte';
	import MarketingFooter from '$lib/components/marketing/MarketingFooter.svelte';
	import { authClient } from '$lib/auth-client';
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { Check, Link2, ShieldCheck } from '@lucide/svelte';

	const session = authClient.useSession();
	let code = $state('');
	let busy = $state(false);
	let approved = $state(false);
	let invalid = $state(false);

	async function approve() {
		if (busy || approved) return;
		invalid = false;
		busy = true;
		try {
			const response = await fetch('/api/device-link/approve', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ code }),
				credentials: 'same-origin'
			});
			if (!response.ok) {
				invalid = true;
				return;
			}
			approved = true;
		} catch {
			invalid = true;
		} finally {
			busy = false;
		}
	}
</script>

<svelte:head>
	<title>{m.device_link_title()} — Ace Blocker</title>
	<meta name="robots" content="noindex, nofollow" />
	<meta name="referrer" content="no-referrer" />
</svelte:head>

<Navbar />
<main id="main-content" class="border-b border-border">
	<div class="ace-shell grid gap-10 py-14 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:py-20">
		<div>
			<p class="font-mono text-xs text-signal-deep dark:text-signal">
				{m.site_brand_name()} / {m.plan_pro_name()}
			</p>
			<h1 class="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
				{m.device_link_title()}
			</h1>
			<p class="mt-5 max-w-md leading-relaxed text-muted-foreground">
				{m.device_link_subtitle()}
			</p>
			<p class="mt-6 border-l-4 border-signal bg-signal/10 px-4 py-3 text-sm leading-relaxed">
				{m.device_link_warning()}
			</p>
		</div>
		<div
			class="rounded-lg border border-border bg-card p-5 sm:p-8"
			data-testid="device-link-form"
		>
			{#if approved}
				<ShieldCheck class="size-10 text-success" aria-hidden="true" />
				<h2 class="mt-4 font-display text-2xl font-semibold">
					{m.device_link_success_title()}
				</h2>
				<p class="mt-3 leading-relaxed text-muted-foreground">
					{m.device_link_success_body()}
				</p>
			{:else}
				<ol
					class="mb-7 space-y-3 border-b border-border pb-6 text-sm text-muted-foreground"
				>
					<li class="flex items-center gap-3">
						<Link2
							class="size-4 shrink-0 text-signal-deep"
							aria-hidden="true"
						/>{m.device_link_quickstart()}
					</li>
					<li class="flex items-center gap-3">
						<Check
							class="size-4 shrink-0 text-signal-deep"
							aria-hidden="true"
						/>{m.device_link_mismatch()}
					</li>
				</ol>
				{#if !$session.data}
					<p class="mb-5 text-sm text-muted-foreground">{m.device_link_from_desktop()}</p>
					<form action={resolve('/signin')} method="GET">
						<input type="hidden" name="redirectTo" value="/connect" />
						<button
							type="submit"
							class="inline-flex min-h-12 items-center rounded-md bg-foreground px-5 font-semibold text-background"
							>{m.device_link_signin()}</button
						>
					</form>
				{:else}
					<form
						onsubmit={(event) => {
							event.preventDefault();
							void approve();
						}}
					>
						<label for="device-code" class="block text-sm font-semibold"
							>{m.device_link_code_label()}</label
						>
						<input
							id="device-code"
							name="device-code"
							autocomplete="off"
							autocapitalize="characters"
							spellcheck="false"
							class="mt-2 w-full rounded-md border border-border bg-background px-4 py-3 font-mono text-lg tracking-wider uppercase focus-visible:outline-2 focus-visible:outline-offset-2"
							placeholder={m.device_link_code_hint()}
							maxlength="16"
							required
							bind:value={code}
						/>
						{#if invalid}
							<p role="alert" class="mt-2 text-sm text-danger">
								{m.device_link_error()}
							</p>
						{/if}
						<button
							type="submit"
							disabled={busy || code.trim().length < 12}
							class="mt-5 inline-flex min-h-12 items-center rounded-md bg-foreground px-5 font-semibold text-background disabled:opacity-45"
						>
							{m.device_link_confirm()}
						</button>
					</form>
				{/if}
			{/if}
		</div>
	</div>
</main>
<MarketingFooter />
