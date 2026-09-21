<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Mail } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import AuthBrandedPanel from '$lib/components/AuthBrandedPanel.svelte';
	import AuthMobileHeader from '$lib/components/AuthMobileHeader.svelte';
	import AuthTopBar from '$lib/components/AuthTopBar.svelte';
	import { deliverApiKeyToEngine } from '$lib/utils/engine-link';
	import SignUpForm from './_components/SignUpForm.svelte';

	let isSubmitted = $state(false);
	let submittedEmail = $state('');

	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));

	async function linkEngine(): Promise<boolean> {
		try {
			const delivered = await deliverApiKeyToEngine();
			if (delivered) goto(resolve('/'));
			return true;
		} catch (err) {
			console.error(err);
			return false;
		}
	}

	$effect(() => {
		if ($session.data) {
			if (origin === 'ace-engine' || origin === 'aceblocker') {
				linkEngine();
			} else {
				goto(resolve('/'));
			}
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
			{#if !isSubmitted}
				<SignUpForm {origin} onlinkengine={linkEngine} onsubmitted={handleSubmitted} />
			{:else}
				<div class="border-l-4 border-success pl-5">
					<div
						class="flex size-11 items-center justify-center rounded-md border border-success/35 bg-success/10 text-success"
					>
						<Mail class="size-5" aria-hidden="true" />
					</div>
					<h1 class="mt-6 font-display text-4xl font-semibold">
						{m.auth_check_email_title()}
					</h1>
					<p class="mt-3 leading-relaxed text-muted-foreground">
						{m.auth_check_email_description({ email: submittedEmail })}
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
