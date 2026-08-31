<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle, ArrowLeft, Key } from '@lucide/svelte';

	let {
		code = $bindable(''),
		error = null,
		loading = false,
		onverify,
		onback
	} = $props<{
		code?: string;
		error?: string | null;
		loading?: boolean;
		onverify: (e: Event) => void;
		onback: () => void;
	}>();
</script>

<div class="mb-8">
	<h2 class="mb-2 text-4xl font-bold dark:text-white">Two-Factor</h2>
	<p class="text-muted-foreground">Enter the 6-digit code sent to your email.</p>
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

<form onsubmit={onverify} class="space-y-6">
	<div class="space-y-2">
		<Label for="otp" class="text-foreground/80 dark:text-slate-300"
			>Verification Code</Label
		>
		<div class="relative">
			<Input
				id="otp"
				type="text"
				placeholder="000000"
				pattern="\d*"
				maxlength={6}
				bind:value={code}
				required
				class="h-14 border-input bg-card text-center text-2xl font-bold tracking-[0.5em] text-foreground placeholder:text-muted-foreground/30 focus:border-brand/50 focus:ring-brand/20 dark:border-slate-800 dark:bg-slate-900/50 dark:text-white"
			/>
			<Key
				class="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-muted-foreground"
			/>
		</div>
	</div>

	<Button
		type="submit"
		class="h-12 w-full bg-brand font-bold text-black transition-all hover:bg-amber-400 active:scale-[0.98]"
		disabled={loading || code.length !== 6}
	>
		{#if loading}
			<Loader2 class="mr-2 h-5 w-5 animate-spin" />
			Verifying...
		{:else}
			Verify Code
		{/if}
	</Button>

	<Button
		variant="ghost"
		class="w-full text-muted-foreground hover:text-foreground"
		onclick={onback}
	>
		<ArrowLeft class="mr-2 h-4 w-4" />
		Back to login
	</Button>
</form>
