<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, CheckCircle2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages.js';
	import { resolve } from '$app/paths';

	let {
		origin = null,
		onlinkengine,
		onsubmitted
	}: {
		origin?: string | null;
		onlinkengine: () => Promise<boolean>;
		onsubmitted: (email: string) => void;
	} = $props();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	const passwordsMatch = $derived(password.length > 0 && password === confirmPassword);

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
							error = m.auth_link_error();
						}
					} else {
						loading = false;
						onsubmitted(email);
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

<header class="mb-8">
	<h1 class="font-display text-4xl font-semibold">{m.auth_sign_up_title()}</h1>
	<p class="mt-2 text-muted-foreground">{m.auth_sign_up_description()}</p>
</header>

{#if error}
	<Alert.Root variant="destructive" class="mb-6 border-danger/40 bg-danger/10 text-foreground">
		<AlertCircle class="size-4 text-danger" aria-hidden="true" />
		<Alert.Title>{m.auth_error_generic()}</Alert.Title>
		<Alert.Description>{error}</Alert.Description>
	</Alert.Root>
{/if}

<form onsubmit={handleSignUp} class="space-y-5">
	<div class="space-y-2">
		<Label for="name">{m.auth_name_label()}</Label>
		<Input
			id="name"
			name="name"
			type="text"
			autocomplete="name"
			placeholder={m.auth_name_placeholder()}
			bind:value={name}
			required
			class="h-11 bg-card"
		/>
	</div>

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
		<Label for="password">{m.auth_password_label()}</Label>
		<Input
			id="password"
			name="password"
			type="password"
			autocomplete="new-password"
			placeholder="••••••••"
			bind:value={password}
			required
			class="h-11 bg-card"
		/>
	</div>

	<div class="space-y-2">
		<div class="flex items-center justify-between gap-4">
			<Label for="confirm-password">{m.auth_confirm_password_label()}</Label>
			{#if confirmPassword && passwordsMatch}
				<span class="flex items-center gap-1 text-xs font-medium text-success">
					<CheckCircle2 class="size-3.5" aria-hidden="true" />
					{m.auth_password_match()}
				</span>
			{:else if confirmPassword && !passwordsMatch}
				<span class="text-xs font-medium text-danger">{m.auth_password_no_match()}</span>
			{/if}
		</div>
		<Input
			id="confirm-password"
			name="confirmPassword"
			type="password"
			autocomplete="new-password"
			placeholder="••••••••"
			bind:value={confirmPassword}
			required
			aria-invalid={Boolean(confirmPassword) && !passwordsMatch}
			class={['h-11 bg-card', confirmPassword && !passwordsMatch && 'border-danger']}
		/>
	</div>

	<Button type="submit" class="mt-2 h-12 w-full font-medium" disabled={loading}>
		{#if loading}
			<Loader2 class="size-4 animate-spin" aria-hidden="true" />
			{m.auth_signing_up()}
		{:else}
			{m.auth_sign_up_button()}
		{/if}
	</Button>
</form>

<p class="mt-8 text-center text-sm text-muted-foreground">
	{m.auth_already_have_account()}
	<a href={resolve('/signin')} class="ml-1 font-medium text-foreground hover:underline">
		{m.auth_sign_in_button()}
	</a>
</p>
