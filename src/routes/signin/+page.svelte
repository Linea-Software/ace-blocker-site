<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, CheckCircle2 } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import AuthBrandedPanel from '$lib/components/AuthBrandedPanel.svelte';
	import AuthMobileHeader from '$lib/components/AuthMobileHeader.svelte';
	import AuthTopBar from '$lib/components/AuthTopBar.svelte';
	import { deliverApiKeyToEngine } from '$lib/utils/engine-link';
	import OtpStep from './_components/OtpStep.svelte';

	let email = $state<string>('');
	let password = $state<string>('');
	let otpCode = $state<string>('');
	let error = $state<string | null>(null);
	let loading = $state(false);
	let linkAttempted = $state(false);
	let linkPending = $state(false);
	let step = $state<'credentials' | 'otp'>('credentials');
	const resetSuccess = $derived(page.url.searchParams.get('reset') === 'success');

	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));
	const checkoutReturn = $derived(
		(() => {
			const candidate = page.url.searchParams.get('redirectTo');
			return candidate?.startsWith('/checkout?') && !candidate.startsWith('//')
				? candidate
				: null;
		})()
	);

	async function linkEngine() {
		if (linkAttempted) return;
		linkAttempted = true;
		loading = true;
		error = null;
		try {
			await deliverApiKeyToEngine();
			linkPending = true;
		} catch (err) {
			console.error(err);
			error = m.auth_link_error();
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (
			$session.data &&
			(origin === 'ace-engine' || origin === 'aceblocker') &&
			!linkAttempted &&
			!loading
		) {
			linkEngine();
		}
	});

	async function handleSignIn(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;
		await authClient.signIn.email(
			{
				email,
				password,
				callbackURL: '/'
			},
			{
				onSuccess: async (ctx) => {
					if (ctx.data.twoFactorRedirect) {
						step = 'otp';
						loading = false;
						await authClient.twoFactor.sendOtp();
					} else if (checkoutReturn) {
						loading = false;
						await goto(checkoutReturn);
					} else if (origin === 'ace-engine' || origin === 'aceblocker') {
						await linkEngine();
					} else {
						loading = false;
						goto(resolve('/'));
					}
				},
				onError: (ctx) => {
					loading = false;
					error = ctx.error.message;
				}
			}
		);
	}

	async function handleVerifyOtp(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;
		await authClient.twoFactor.verifyOtp(
			{ code: otpCode },
			{
				onSuccess: async () => {
					if (checkoutReturn) {
						loading = false;
						await goto(checkoutReturn);
						return;
					}
					if (origin === 'ace-engine' || origin === 'aceblocker') {
						await linkEngine();
					} else {
						loading = false;
						goto(resolve('/'));
					}
				},
				onError: (ctx) => {
					loading = false;
					error = ctx.error.message;
				}
			}
		);
	}

	function backToCredentials() {
		step = 'credentials';
		error = null;
		otpCode = '';
	}
</script>

<svelte:head>
	<title>{m.page_title_sign_in()}</title>
	<meta name="description" content={m.auth_sign_in_description()} />
	<meta property="og:title" content={m.page_title_sign_in()} />
	<meta property="og:description" content={m.auth_sign_in_description()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_sign_in()} />
	<meta name="twitter:description" content={m.auth_sign_in_description()} />
</svelte:head>

<div class="flex min-h-screen w-full bg-background text-foreground">
	<AuthBrandedPanel />

	<main
		class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2"
	>
		<AuthMobileHeader switchHref="/signup" switchLabel={m.auth_sign_up_button()} />

		{#if !origin}
			<AuthTopBar backLabel={m.auth_back_home()} />
		{/if}

		<div class="w-full max-w-md">
			{#if linkPending}
				<div class="border-l-4 border-information bg-information/5 p-6" role="status">
					<CheckCircle2 class="size-6 text-information" aria-hidden="true" />
					<h1 class="mt-4 font-display text-3xl font-semibold">
						{m.auth_link_pending_title()}
					</h1>
					<p class="mt-3 leading-relaxed text-muted-foreground">
						{m.auth_link_pending_description()}
					</p>
				</div>
			{:else if step === 'credentials'}
				<header class="mb-8">
					<h1 class="font-display text-4xl font-semibold">{m.auth_sign_in_title()}</h1>
					<p class="mt-2 text-muted-foreground">{m.auth_sign_in_description()}</p>
				</header>

				{#if error}
					<Alert.Root
						variant="destructive"
						class="mb-6 border-danger/40 bg-danger/10 text-foreground"
					>
						<AlertCircle class="size-4 text-danger" aria-hidden="true" />
						<Alert.Title>{m.auth_error_title()}</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if linkAttempted && error && (origin === 'aceblocker' || origin === 'ace-engine')}
					<button
						type="button"
						class="mb-6 inline-flex min-h-10 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-accent"
						onclick={() => {
							linkAttempted = false;
							void linkEngine();
						}}
					>
						{m.checkout_activation_retry()}
					</button>
				{/if}

				{#if resetSuccess}
					<Alert.Root class="mb-6 border-success/40 bg-success/10 text-foreground">
						<CheckCircle2 class="size-4 text-success" aria-hidden="true" />
						<Alert.Description>{m.auth_reset_success()}</Alert.Description>
					</Alert.Root>
				{/if}

				<form onsubmit={handleSignIn} class="space-y-5">
					<div class="space-y-2">
						<Label for="email">{m.auth_email_label()}</Label>
						<Input
							id="email"
							name="email"
							type="email"
							spellcheck={false}
							autocomplete="email"
							placeholder={m.auth_email_placeholder()}
							bind:value={email}
							required
							class="h-11 bg-card"
						/>
					</div>

					<div class="space-y-2">
						<div class="flex items-center justify-between gap-4">
							<Label for="password">{m.auth_password_label()}</Label>
							<a
								href={resolve('/forgot-password')}
								class="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
							>
								{m.auth_forgot_password()}
							</a>
						</div>
						<Input
							id="password"
							name="password"
							type="password"
							autocomplete="current-password"
							placeholder="••••••••"
							bind:value={password}
							required
							class="h-11 bg-card"
						/>
					</div>

					<Button type="submit" class="h-12 w-full font-medium" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
							{m.auth_signing_in()}
						{:else}
							{m.auth_sign_in_button()}
						{/if}
					</Button>
				</form>

				<p class="mt-8 text-center text-sm text-muted-foreground">
					{m.auth_don_t_have_account()}
					<a
						href={resolve('/signup')}
						class="ml-1 inline-flex min-h-11 items-center font-medium text-foreground hover:underline"
					>
						{m.auth_sign_up_button()}
					</a>
				</p>
			{:else}
				<OtpStep
					bind:code={otpCode}
					{error}
					{loading}
					onverify={handleVerifyOtp}
					onback={backToCredentials}
				/>
			{/if}
		</div>
	</main>
</div>
