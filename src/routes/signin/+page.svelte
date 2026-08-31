<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle } from '@lucide/svelte';
	import { page } from '$app/state';
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
	let step = $state<'credentials' | 'otp'>('credentials');
	const resetSuccess = $derived(page.url.searchParams.get('reset') === 'success');

	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));

	async function linkEngine() {
		loading = true;
		error = null;
		try {
			const delivered = await deliverApiKeyToEngine();
			if (delivered) goto('/');
		} catch (err) {
			console.error(err);
			loading = false;
			error = 'Failed to generate access keys for the engine.';
		}
	}

	$effect(() => {
		if ($session.data && (origin === 'ace-engine' || origin === 'aceblocker') && !loading) {
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
					} else if (origin === 'ace-engine' || origin === 'aceblocker') {
						await linkEngine();
					} else {
						loading = false;
						goto('/');
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
			{
				code: otpCode
			},
			{
				onSuccess: async () => {
					if (origin === 'ace-engine' || origin === 'aceblocker') {
						await linkEngine();
					} else {
						loading = false;
						goto('/');
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

<div class="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
	<AuthBrandedPanel />

	<!-- Right Side: Form Container -->
	<div class="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
		<AuthMobileHeader switchHref="/signup" switchLabel={m.auth_sign_up_button()} />

		{#if !origin}
			<AuthTopBar backLabel="Back to home" />
		{/if}

		<div class="w-full max-w-md animate-in duration-700 fade-in slide-in-from-bottom-4">
			{#if step === 'credentials'}
				<div class="mb-8">
					<h2 class="mb-2 text-4xl font-bold dark:text-white">
						{m.auth_sign_in_title()}
					</h2>
					<p class="text-muted-foreground">{m.auth_sign_in_description()}</p>
				</div>

				{#if error}
					<Alert.Root
						variant="destructive"
						class="mb-6 border-red-900/50 bg-red-900/10 text-red-400"
					>
						<AlertCircle class="h-4 w-4" />
						<Alert.Title>Error</Alert.Title>
						<Alert.Description>{error}</Alert.Description>
					</Alert.Root>
				{/if}

				{#if resetSuccess}
					<Alert.Root
						class="mb-6 border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
					>
						<AlertCircle class="h-4 w-4" />
						<Alert.Description>
							Your password has been reset successfully. Please sign in with your new
							password.
						</Alert.Description>
					</Alert.Root>
				{/if}

				<form onsubmit={handleSignIn} class="space-y-6">
					<div class="space-y-2">
						<Label for="email" class="text-foreground/80 dark:text-slate-300"
							>{m.auth_email_label()}</Label
						>
						<Input
							id="email"
							type="email"
							placeholder="you@example.com"
							bind:value={email}
							required
							class="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
						/>
					</div>
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<Label for="password" class="text-foreground/80 dark:text-slate-300"
								>{m.auth_password_label()}</Label
							>
							<a
								href="/forgot-password"
								class="text-xs text-brand hover:underline">Forgot password?</a
							>
						</div>
						<Input
							id="password"
							type="password"
							placeholder="••••••••"
							bind:value={password}
							required
							class="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
						/>
					</div>

					<Button
						type="submit"
						class="h-12 w-full bg-brand font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
						disabled={loading}
					>
						{#if loading}
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							{m.auth_signing_in()}
						{:else}
							{m.auth_sign_in_button()}
						{/if}
					</Button>
				</form>

				<div class="mt-8 text-center text-sm text-slate-500">
					{m.auth_don_t_have_account()}
					<a
						href="/signup"
						class="px-1 font-semibold text-brand hover:text-amber-400 hover:underline"
					>
						{m.auth_sign_up_button()}
					</a>
				</div>
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
	</div>
</div>
