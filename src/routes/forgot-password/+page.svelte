<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, ArrowLeft, Sun, Moon, Mail, Key, Lock } from '@lucide/svelte';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { page } from '$app/state';
	import { toggleMode, mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages.js';

	let email = $state('');
	let otp = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);
	let step = $state<'email' | 'reset'>('email');
	let isDark = $derived(mode.current === 'dark');

	async function handleRequestReset(e: Event) {
		e.preventDefault();
		loading = true;
		error = null;

		const { error: apiError } = await authClient.emailOtp.requestPasswordReset({ email });

		if (apiError) {
			error = apiError.message || 'Failed to send verification code.';
			loading = false;
			return;
		}

		loading = false;
		step = 'reset';
	}

	async function handleResetPassword(e: Event) {
		e.preventDefault();
		if (newPassword !== confirmPassword) {
			error = 'Passwords do not match.';
			return;
		}
		if (newPassword.length < 8) {
			error = 'Password must be at least 8 characters.';
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
			error = apiError.message || 'Failed to reset password. Check your code and try again.';
			loading = false;
			return;
		}

		goto('/signin?reset=success');
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

<div class="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
	<!-- Left Side: Branded Panel (Desktop Only) -->
	<div
		class="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0c111d] to-[#030712] p-12 lg:flex"
	>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-brand)_0%,_transparent_70%)] opacity-10"
		></div>

		<a href="/" class="relative z-10 flex items-center transition-opacity hover:opacity-80">
			<img src={darkFullLogo} alt="Ace Blocker" class="h-9 w-auto" />
		</a>

		<div class="relative z-10 space-y-6">
			<h1 class="text-6xl leading-tight font-extrabold tracking-tight text-white">
				{m.auth_reclaim_focus_title()}<br />
				<span class="text-brand">{m.auth_reclaim_focus_subtitle()}</span>
			</h1>
			<p class="max-w-md text-xl text-slate-400">
				{m.hero_description()}
			</p>
		</div>

		<div class="relative z-10">
			<p class="text-sm text-slate-500">
				&copy; {new Date().getFullYear()}
				{m.footer_rights_suffix()}
			</p>
		</div>
	</div>

	<!-- Right Side: Form Container -->
	<div class="flex w-full flex-col items-center justify-center p-6 lg:w-1/2">
		<div class="mb-8 flex w-full max-w-md items-center justify-between lg:hidden">
			<a href="/" class="flex items-center gap-2 font-bold dark:text-white">
				{#if isDark}
					<img src={darkFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
				{:else}
					<img src={lightFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
				{/if}
			</a>
			<Button
				variant="ghost"
				href="/signin"
				class="text-brand hover:bg-brand/10 hover:text-amber-400"
			>
				Sign in
			</Button>
		</div>

		<div
			class="mb-8 w-full max-w-md lg:absolute lg:top-8 lg:right-8 lg:mb-0 lg:flex lg:items-center lg:justify-end lg:gap-4"
		>
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9 rounded-md text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
				onclick={toggleMode}
			>
				<Sun
					class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
				/>
				<Moon
					class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>
			<Button
				variant="ghost"
				href="/signin"
				class="text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
			>
				<ArrowLeft class="mr-2 h-4 w-4" />
				Back to sign in
			</Button>
		</div>

		<div class="w-full max-w-md animate-in duration-700 fade-in slide-in-from-bottom-4">
			{#if step === 'email'}
				<div class="mb-8">
					<h2 class="mb-2 text-4xl font-bold dark:text-white">Reset password</h2>
					<p class="text-muted-foreground">
						Enter your email and we'll send you a verification code.
					</p>
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

				<form onsubmit={handleRequestReset} class="space-y-6">
					<div class="space-y-2">
						<Label for="email" class="text-foreground/80 dark:text-slate-300"
							>Email address</Label
						>
						<div class="relative">
							<Input
								id="email"
								type="email"
								placeholder="you@example.com"
								bind:value={email}
								required
								class="border-input bg-card pl-10 text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
							/>
							<Mail
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
					</div>

					<Button
						type="submit"
						class="h-12 w-full bg-brand font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
						disabled={loading || !email}
					>
						{#if loading}
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							Sending code...
						{:else}
							Send verification code
						{/if}
					</Button>
				</form>
			{:else}
				<div class="mb-8">
					<h2 class="mb-2 text-4xl font-bold dark:text-white">Set new password</h2>
					<p class="text-muted-foreground">
						Enter the code sent to <span class="font-medium text-foreground">{email}</span> and
						choose a new password.
					</p>
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

				<form onsubmit={handleResetPassword} class="space-y-6">
					<div class="space-y-2">
						<Label for="otp" class="text-foreground/80 dark:text-slate-300"
							>Verification code</Label
						>
						<div class="relative">
							<Input
								id="otp"
								type="text"
								placeholder="000000"
								pattern="\d*"
								maxlength={6}
								bind:value={otp}
								required
								class="border-input bg-card pl-10 text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground/30 focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
							/>
							<Key
								class="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="new-password" class="text-foreground/80 dark:text-slate-300"
							>New password</Label
						>
						<div class="relative">
							<Input
								id="new-password"
								type="password"
								placeholder="••••••••"
								bind:value={newPassword}
								required
								minlength={8}
								class="border-input bg-card pl-10 text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
							/>
							<Lock
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
					</div>

					<div class="space-y-2">
						<Label
							for="confirm-password"
							class="text-foreground/80 dark:text-slate-300">Confirm password</Label
						>
						<div class="relative">
							<Input
								id="confirm-password"
								type="password"
								placeholder="••••••••"
								bind:value={confirmPassword}
								required
								minlength={8}
								class="border-input bg-card pl-10 text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
							/>
							<Lock
								class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
							/>
						</div>
					</div>

					<Button
						type="submit"
						class="h-12 w-full bg-brand font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
						disabled={loading || otp.length !== 6 || newPassword.length < 8 || confirmPassword.length < 8}
					>
						{#if loading}
							<Loader2 class="mr-2 h-5 w-5 animate-spin" />
							Resetting password...
						{:else}
							Reset password
						{/if}
					</Button>

					<Button
						variant="ghost"
						class="w-full text-muted-foreground hover:text-foreground"
						onclick={() => {
							step = 'email';
							error = null;
							otp = '';
							newPassword = '';
							confirmPassword = '';
						}}
					>
						<ArrowLeft class="mr-2 h-4 w-4" />
						Back to email entry
					</Button>
				</form>
			{/if}
		</div>
	</div>
</div>
