<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, ArrowLeft, Key } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let {
		code = $bindable(''),
		error = null,
		loading = false,
		onverify,
		onback
	}: {
		code?: string;
		error?: string | null;
		loading?: boolean;
		onverify: (e: Event) => void;
		onback: () => void;
	} = $props();
</script>

<header class="mb-8">
	<h1 class="font-display text-4xl font-semibold">{m.auth_2fa_title()}</h1>
	<p class="mt-2 text-muted-foreground">{m.auth_2fa_description()}</p>
</header>

{#if error}
	<Alert.Root variant="destructive" class="mb-6 border-danger/40 bg-danger/10 text-foreground">
		<AlertCircle class="size-4 text-danger" aria-hidden="true" />
		<Alert.Title>{m.auth_error_generic()}</Alert.Title>
		<Alert.Description>{error}</Alert.Description>
	</Alert.Root>
{/if}

<form onsubmit={onverify} class="space-y-5">
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
				bind:value={code}
				required
				class="h-14 bg-card pl-11 text-center font-mono text-2xl tracking-[0.35em]"
			/>
			<Key
				class="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
				aria-hidden="true"
			/>
		</div>
	</div>

	<Button type="submit" class="h-12 w-full font-medium" disabled={loading}>
		{#if loading}
			<Loader2 class="size-4 animate-spin" aria-hidden="true" />
			{m.auth_verifying_code()}
		{:else}
			{m.auth_verify_code()}
		{/if}
	</Button>

	<Button type="button" variant="ghost" class="w-full text-muted-foreground" onclick={onback}>
		<ArrowLeft class="size-4" aria-hidden="true" />
		{m.auth_back_login()}
	</Button>
</form>
