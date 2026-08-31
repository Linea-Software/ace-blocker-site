<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft, Mail } from '@lucide/svelte';
	import { page } from '$app/state';
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
			if (delivered) goto('/');
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
				goto('/');
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

<div class="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
	<AuthBrandedPanel />

	<!-- Right Side: Form Container -->
	<div class="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
		<AuthMobileHeader switchHref="/signin" switchLabel={m.auth_sign_in_button()} />

		<AuthTopBar backLabel="Back to home" />

		<div class="w-full max-w-md animate-in duration-700 fade-in slide-in-from-bottom-4">
			{#if !isSubmitted}
				<SignUpForm {origin} onlinkengine={linkEngine} onsubmitted={handleSubmitted} />
			{:else}
				<div class="animate-in text-center duration-500 zoom-in-95">
					<div class="relative mx-auto mb-6 h-24 w-24">
						<div
							class="absolute inset-0 animate-ping rounded-full bg-brand/20 duration-[3000ms]"
						></div>
						<div
							class="relative flex h-full w-full items-center justify-center rounded-full bg-brand/10"
						>
							<Mail class="h-12 w-12 text-brand" />
						</div>
					</div>
					<h2 class="mb-3 text-3xl font-bold dark:text-white">Check your email</h2>
					<p class="text-lg leading-relaxed text-muted-foreground">
						We've sent a verification link to <span class="font-medium text-foreground"
							>{submittedEmail}</span
						>.<br />
						Click the link to activate your account and access your dashboard.
					</p>
					<div class="mt-10">
						<Button
							variant="outline"
							href="/signin"
							class="border-slate-800 bg-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
						>
							<ArrowLeft class="mr-2 h-4 w-4" />
							Back to sign in
						</Button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
