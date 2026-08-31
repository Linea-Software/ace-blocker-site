<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, CheckCircle2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';

	let {
		origin = null,
		onlinkengine,
		onsubmitted
	} = $props<{
		origin?: string | null;
		onlinkengine: () => Promise<boolean>;
		onsubmitted: (email: string) => void;
	}>();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	const passwordsMatch = $derived(password.length > 0 && password === confirmPassword);
	const canSubmit = $derived(!loading && name && email && password && passwordsMatch);

	async function handleSignUp(e: Event) {
		e.preventDefault();
		if (!passwordsMatch) {
			error = m.auth_passwords_do_not_match();
			return;
		}
		loading = true;
		error = null;
		await authClient.signUp.email(
			{
				email,
				password,
				name,
				callbackURL: '/'
			},
			{
				onSuccess: async () => {
					if (origin === 'ace-engine' || origin === 'aceblocker') {
						const linked = await onlinkengine();
						if (!linked) {
							loading = false;
							error = 'Failed to generate access keys for the engine.';
						}
					} else {
						loading = false;
						onsubmitted(email);
						// Clear sensitive data after submission
						password = '';
						confirmPassword = '';
					}
				},
				onError: (ctx: any) => {
					loading = false;
					error = ctx.error.message;
				}
			}
		);
	}
</script>

<div class="mb-8">
	<h2 class="mb-2 text-4xl font-bold dark:text-white">
		{m.auth_sign_up_title()}
	</h2>
	<p class="text-muted-foreground">{m.auth_sign_up_description()}</p>
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

<form onsubmit={handleSignUp} class="space-y-5">
	<div class="space-y-2">
		<Label for="name" class="text-foreground/80 dark:text-slate-300"
			>{m.auth_name_label()}</Label
		>
		<Input
			id="name"
			type="text"
			placeholder="John Doe"
			bind:value={name}
			required
			class="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
		/>
	</div>
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
		<Label for="password" class="text-foreground/80 dark:text-slate-300"
			>{m.auth_password_label()}</Label
		>
		<Input
			id="password"
			type="password"
			placeholder="••••••••"
			bind:value={password}
			required
			class="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
		/>
	</div>
	<div class="space-y-2">
		<div class="flex items-center justify-between">
			<Label
				for="confirm-password"
				class="text-foreground/80 dark:text-slate-300"
				>{m.auth_confirm_password_label()}</Label
			>
			{#if confirmPassword && passwordsMatch}
				<span
					class="flex items-center gap-1 text-[10px] font-bold tracking-wider text-green-500 uppercase"
				>
					<CheckCircle2 class="h-3 w-3" />
					Match
				</span>
			{:else if confirmPassword && !passwordsMatch}
				<span
					class="text-[10px] font-bold tracking-wider text-red-500 uppercase"
				>
					No Match
				</span>
			{/if}
		</div>
		<Input
			id="confirm-password"
			type="password"
			placeholder="••••••••"
			bind:value={confirmPassword}
			required
			class="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white {confirmPassword &&
			!passwordsMatch
				? 'border-red-900/50 ring-red-900/20'
				: ''}"
		/>
	</div>

	<Button
		type="submit"
		class="mt-4 h-12 w-full bg-brand font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
		disabled={!canSubmit}
	>
		{#if loading}
			<Loader2 class="mr-2 h-5 w-5 animate-spin" />
			{m.auth_signing_up()}
		{:else}
			{m.auth_sign_up_button()}
		{/if}
	</Button>
</form>

<div class="mt-8 text-center text-sm text-slate-500">
	{m.auth_already_have_account()}
	<a
		href="/signin"
		class="px-1 font-semibold text-brand hover:text-amber-400 hover:underline"
	>
		{m.auth_sign_in_button()}
	</a>
</div>
