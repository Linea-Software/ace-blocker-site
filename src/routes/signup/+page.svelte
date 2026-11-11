<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Mail } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import * as m from '$lib/paraglide/messages.js';
	import AuthBrandedPanel from '$lib/components/AuthBrandedPanel.svelte';
	import AuthMobileHeader from '$lib/components/AuthMobileHeader.svelte';
	import AuthTopBar from '$lib/components/AuthTopBar.svelte';
	import { deliverApiKeyToEngine } from '$lib/utils/engine-link';
	import SignUpForm from './_components/SignUpForm.svelte';

	let isSubmitted = $state(false);
	let linkPending = $state(false);
	let linkError = $state(false);
	let linkPromise: Promise<boolean> | null = null;
	let submittedEmail = $state('');

	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));

	function linkEngine(): Promise<boolean> {
		if (linkPromise) return linkPromise;
		linkPromise = (async () => {
			try {
				await deliverApiKeyToEngine();
				linkPending = true;
				return true;
			} catch (err) {
				console.error(err);
				linkError = true;
				return false;
			}
		})();
		return linkPromise;
	}

	$effect(() => {
		if ($session.data && origin !== 'ace-engine' && origin !== 'aceblocker') {
			goto(resolve(localizeHref('/') as '/'));
		}
	});

	function handleSubmitted(email: string) {
		submittedEmail = email;
		isSubmitted = true;
	}
</script>

<svelte:head>
	<title>{m.page_title_sign_up()}</title>
	<meta name="description" content={m.auth_sign_up_description()} />
	<meta property="og:title" content={m.page_title_sign_up()} />
	<meta property="og:description" content={m.auth_sign_up_description()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_sign_up()} />
	<meta name="twitter:description" content={m.auth_sign_up_description()} />
</svelte:head>

<div class="flex min-h-screen w-full bg-background text-foreground">
	<AuthBrandedPanel />

	<main
		class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2"
	>
		<AuthMobileHeader switchHref="/signin" switchLabel={m.auth_sign_in_button()} />
		<AuthTopBar backLabel={m.auth_back_home()} />

		<div class="w-full max-w-md">
			{#if linkError}
				<div role="alert" class="border-l-4 border-danger bg-danger/5 p-6">
					<h1 class="font-display text-3xl font-semibold">{m.auth_link_error()}</h1>
					<p class="mt-3 text-sm leading-relaxed text-muted-foreground">
						{m.pro_activation_error_detail()}
					</p>
					<button
						type="button"
						class="mt-5 inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium hover:bg-accent"
						onclick={() => {
							linkPromise = null;
							linkError = false;
							void linkEngine();
						}}
					>
						{m.checkout_activation_retry()}
					</button>
				</div>
			{:else if $session.data && (origin === 'ace-engine' || origin === 'aceblocker') && !linkPending}
				<div class="border-l-4 border-information bg-information/5 p-6" role="status">
					<h1 class="font-display text-3xl font-semibold">{m.device_link_title()}</h1>
					<p class="mt-3 text-sm leading-relaxed text-muted-foreground">
						{m.device_link_from_desktop()}
					</p>
					<a
						href={resolve('/connect')}
						class="mt-5 inline-flex min-h-11 items-center rounded-md bg-foreground px-4 text-sm font-medium text-background"
						>{m.device_link_title()}</a
					>
					<button
						type="button"
						class="mt-3 inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
						onclick={() => void linkEngine()}>{m.pro_activation_open()}</button
					>
				</div>
			{:else if !isSubmitted && !linkPending}
				<SignUpForm onsubmitted={handleSubmitted} />
			{:else}
				<div class="border-l-4 border-information pl-5">
					<div
						class="flex size-11 items-center justify-center rounded-md border border-information/35 bg-information/10 text-information"
					>
						<Mail class="size-5" aria-hidden="true" />
					</div>
					<h1 class="mt-6 font-display text-4xl font-semibold">
						{linkPending ? m.auth_link_pending_title() : m.auth_check_email_title()}
					</h1>
					<p class="mt-3 leading-relaxed text-muted-foreground">
						{linkPending
							? m.auth_link_pending_description()
							: m.auth_check_email_description({ email: submittedEmail })}
					</p>
					<a
						href={resolve('/signin')}
						class="mt-8 inline-flex min-h-11 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
					>
						{m.auth_back_sign_in()}
					</a>
				</div>
			{/if}
		</div>
	</main>
</div>
