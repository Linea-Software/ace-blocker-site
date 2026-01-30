<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';
	import Navbar from '$lib/components/Navbar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Loader2, AlertCircle } from '@lucide/svelte';

	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

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
				onSuccess: () => {
					loading = false;
					goto('/');
				},
				onError: (ctx) => {
					loading = false;
					error = ctx.error.message;
				}
			}
		);
	}
</script>

<Navbar />

<div class="flex min-h-[calc(100-4rem)] items-center justify-center bg-muted/40 p-4">
	<Card.Root class="w-full max-w-md shadow-lg">
		<Card.Header class="space-y-1">
			<Card.Title class="text-2xl font-bold tracking-tight">Sign In</Card.Title>
			<Card.Description>Enter your email and password to access your account</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if error}
				<Alert.Root variant="destructive" class="mb-6">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
			<form onsubmit={handleSignIn} class="space-y-4">
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						type="email"
						placeholder="you@example.com"
						bind:value={email}
						required
					/>
				</div>
				<div class="space-y-2">
					<Label for="password">Password</Label>
					<Input
						id="password"
						type="password"
						placeholder="••••••••"
						bind:value={password}
						required
					/>
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{#if loading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Signing in...
					{:else}
						Sign In
					{/if}
				</Button>
			</form>
		</Card.Content>
		<Card.Footer>
			<div class="text-center text-sm text-muted-foreground w-full">
				Don't have an account?
				<a href="/signup" class="text-primary font-medium hover:underline">Sign Up</a>
			</div>
		</Card.Footer>
	</Card.Root>
</div>
