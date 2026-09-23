<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, ArrowLeft, Mail, Key, Lock } from '@lucide/svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages.js';
	import AuthBrandedPanel from '$lib/components/AuthBrandedPanel.svelte';
	import AuthMobileHeader from '$lib/components/AuthMobileHeader.svelte';
	import AuthTopBar from '$lib/components/AuthTopBar.svelte';

	let email = $state('');
	let otp = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);
	let step = $state<'email' | 'reset'>('email');

	async function handleRequestReset(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		const { error: apiError } = await authClient.emailOtp.requestPasswordReset({ email });

		if (apiError) {
			error = apiError.message || m.auth_reset_send_error();
			loading = false;
			return;
		}

		loading = false;
		step = 'reset';
	}

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			error = m.auth_passwords_do_not_match();
			return;
		}
		if (newPassword.length < 8) {
			error = m.auth_password_min_length();
			return;
		}
		loading = true;
		error = null;

		const { error: apiError } = await authClient.emailOtp.resetPassword({
			email,
			otp,
			password: newPassword
		});

		if (apiError) {
			error = apiError.message || m.auth_reset_failed();
			loading = false;
			return;
		}

		const signInResetUrl = resolve('/signin') + '?reset=success';
		goto(signInResetUrl);
	}

	function backToEmail() {
		step = 'email';
		error = null;
		otp = '';
		newPassword = '';
		confirmPassword = '';
	}
</script>

<svelte:head>
	<title>{m.page_title_forgot_password()}</title>
	<meta name="description" content={m.page_description_forgot_password()} />
	<meta property="og:title" content={m.page_title_forgot_password()} />
	<meta property="og:description" content={m.page_description_forgot_password()} />
	<meta property="og:url" content={page.url.href} />
	<meta name="twitter:title" content={m.page_title_forgot_password()} />
	<meta name="twitter:description" content={m.page_description_forgot_password()} />
</svelte:head>

<div class="flex min-h-screen w-full bg-background text-foreground">
	<AuthBrandedPanel />

	<main
		class="relative flex w-full flex-col items-center justify-center px-5 py-8 sm:px-8 lg:w-1/2"
	>
		<AuthMobileHeader switchHref="/signin" switchLabel={m.auth_sign_in_button()} />
		<AuthTopBar backHref="/signin" backLabel={m.auth_back_sign_in()} />

		<div class="w-full max-w-md">
			{#if step === 'email'}
				<header class="mb-8">
					<h1 class="font-display text-4xl font-semibold">{m.auth_reset_title()}</h1>
					<p class="mt-2 text-muted-foreground">{m.auth_reset_description()}</p>
				</header>

				{#if error}
					<Alert.Root
						variant="destructive"
						class="mb-6 border-danger/40 bg-danger/10 text-foreground"
					>
						<AlertCircle class="size-4 text-danger" aria-hidden="true" />
						<Alert.Title>{m.auth_error_generic()}</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				<form onsubmit={handleRequestReset} class="space-y-5">
					<div class="space-y-2">
						<Label for="email">{m.auth_email_label()}</Label>
						<div class="relative">
							<Input
								id="email"
								name="email"
								type="email"
								spellcheck={false}
								autocomplete="email"
								placeholder={m.auth_email_placeholder()}
								bind:value={email}
								required
								class="h-11 bg-card pl-10"
							/>
							<Mail
								class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
					</div>

					<Button type="submit" class="h-12 w-full font-medium" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
							{m.auth_sending_code()}
						{:else}
							{m.auth_send_code()}
						{/if}
					</Button>
				</form>
			{:else}
				<header class="mb-8">
					<h1 class="font-display text-4xl font-semibold">
						{m.auth_set_new_password_title()}
					</h1>
					<p class="mt-2 text-muted-foreground">
						{m.auth_set_new_password_description({ email })}
					</p>
				</header>

				{#if error}
					<Alert.Root
						variant="destructive"
						class="mb-6 border-danger/40 bg-danger/10 text-foreground"
					>
						<AlertCircle class="size-4 text-danger" aria-hidden="true" />
						<Alert.Title>{m.auth_error_generic()}</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				<form onsubmit={handleResetPassword} class="space-y-5">
					<div class="space-y-2">
						<Label for="otp">{m.auth_verification_code_label()}</Label>
						<div class="relative">
							<Input
								id="otp"
								name="otp"
								type="text"
								spellcheck={false}
								inputmode="numeric"
								autocomplete="one-time-code"
								placeholder="000000"
								pattern="\d*"
								minlength={6}
								maxlength={6}
								bind:value={otp}
								required
								class="h-14 bg-card pl-11 text-center font-mono text-2xl tracking-[0.35em]"
							/>
							<Key
								class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="new-password">{m.auth_new_password_label()}</Label>
						<div class="relative">
							<Input
								id="new-password"
								name="newPassword"
								type="password"
								autocomplete="new-password"
								placeholder="••••••••"
								bind:value={newPassword}
								required
								minlength={8}
								class="h-11 bg-card pl-10"
							/>
							<Lock
								class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="confirm-password">{m.auth_confirm_password_label()}</Label>
						<div class="relative">
							<Input
								id="confirm-password"
								name="confirmPassword"
								type="password"
								autocomplete="new-password"
								placeholder="••••••••"
								bind:value={confirmPassword}
								required
								minlength={8}
								class="h-11 bg-card pl-10"
							/>
							<Lock
								class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
					</div>

					<Button type="submit" class="h-12 w-full font-medium" disabled={loading}>
						{#if loading}
							<Loader2 class="size-4 animate-spin" aria-hidden="true" />
							{m.auth_resetting()}
						{:else}
							{m.auth_reset_button()}
						{/if}
					</Button>

					<Button
						type="button"
						variant="ghost"
						class="w-full text-muted-foreground"
						onclick={backToEmail}
					>
						<ArrowLeft class="size-4" aria-hidden="true" />
						{m.auth_back_email()}
					</Button>
				</form>
			{/if}
		</div>
	</main>
</div>
