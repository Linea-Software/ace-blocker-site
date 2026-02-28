<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, Shield, ArrowLeft, Sun, Moon } from '@lucide/svelte';
	import { page } from '$app/state';
	import { toggleMode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages.js';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	const session = authClient.useSession();
	const origin = $derived(page.url.searchParams.get('origin'));

	async function linkEngine() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/v1/account/link-engine', {
				method: 'POST'
			});
			if (!res.ok) throw new Error('Failed to link engine');
			const data = await res.json();
			const apiKey = data.apiKey;

			const localUrl = `https://ace-engine.local/account/api-key?apiKey=${apiKey}`;
			const protocolUrl = `aceblocker://account/api-key?apiKey=${apiKey}`;

			try {
				// Try the local engine first via HTTPS
				const localRes = await fetch(localUrl, { method: 'GET' });
				if (localRes.ok) {
					goto('/');
				} else {
					window.location.href = protocolUrl;
				}
			} catch (err) {
				// If local engine is not reachable or CORS fails, fall back to custom protocol
				console.warn('Local engine link failed, falling back to protocol:', err);
				window.location.href = protocolUrl;
			}
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
</script>

<div class="flex min-h-screen w-full bg-background text-foreground transition-colors duration-300">
	<!-- Left Side: Branded Panel (Desktop Only) -->
	<div
		class="relative hidden w-1/2 flex-col justify-between bg-gradient-to-br from-[#0c111d] to-[#030712] p-12 lg:flex"
	>
		<div
			class="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-amber-500)_0%,_transparent_70%)] opacity-10"
		></div>

		<a href="/" class="relative z-10 flex items-center gap-3 transition-opacity hover:opacity-80">
			<Shield class="h-10 w-10 text-amber-500" />
			<span class="text-3xl font-bold tracking-tight text-white">Ace Blocker</span>
		</a>

		<div class="relative z-10 space-y-6">
			<h1 class="text-6xl leading-tight font-extrabold tracking-tight text-white">
				{m.auth_reclaim_focus_title()}<br />
				<span class="text-amber-500">{m.auth_reclaim_focus_subtitle()}</span>
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
				<Shield class="h-6 w-6 text-amber-500" />
				<span>Ace Blocker</span>
			</a>
			<Button
				variant="ghost"
				href="/signup"
				class="text-amber-500 hover:bg-amber-500/10 hover:text-amber-400"
			>
				{m.auth_sign_up_button()}
			</Button>
		</div>

		{#if !origin}
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
					href="/"
					class="text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
				>
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to home
				</Button>
			</div>
		{/if}

		<div class="w-full max-w-md animate-in duration-700 fade-in slide-in-from-bottom-4">
			<div class="mb-8">
				<h2 class="mb-2 text-4xl font-bold dark:text-white">{m.auth_sign_in_title()}</h2>
				<p class="text-muted-foreground">{m.auth_sign_in_description()}</p>
			</div>

			{#if error}
				<Alert.Root variant="destructive" class="mb-6 border-red-900/50 bg-red-900/10 text-red-400">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
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
						class="border-input bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
					/>
				</div>
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<Label for="password" class="text-foreground/80 dark:text-slate-300"
							>{m.auth_password_label()}</Label
						>
						<a href="/forgot-password" class="text-xs text-amber-500 hover:underline"
							>Forgot password?</a
						>
					</div>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						required
						class="border-input bg-background/50 text-foreground placeholder:text-muted-foreground focus:border-amber-500/50 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
					/>
				</div>

				<Button
					type="submit"
					class="h-12 w-full bg-amber-500 font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
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
					class="px-1 font-semibold text-amber-500 hover:text-amber-400 hover:underline"
				>
					{m.auth_sign_up_button()}
				</a>
			</div>
		</div>
	</div>
</div>
