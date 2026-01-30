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

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let error = $state<string | null>(null);
	let loading = $state(false);

	async function handleSignUp(e: Event) {
		e.preventDefault();
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
			<Card.Title class="text-2xl font-bold tracking-tight">Sign Up</Card.Title>
			<Card.Description>Create an account to start blocking addictions</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if error}
				<Alert.Root variant="destructive" class="mb-6">
					<AlertCircle class="h-4 w-4" />
					<Alert.Title>Error</Alert.Title>
					<Alert.Description>{error}</Alert.Description>
				</Alert.Root>
			{/if}
			<form onsubmit={handleSignUp} class="space-y-4">
				<div class="space-y-2">
					<Label for="name">Name</Label>
					<Input id="name" type="text" placeholder="John Doe" bind:value={name} required />
				</div>
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
						Signing up...
					{:else}
						Sign Up
					{/if}
				</Button>
			</form>
		</Card.Content>
		<Card.Footer>
			<div class="text-center text-sm text-muted-foreground w-full">
				Already have an account?
				<a href="/signin" class="text-primary font-medium hover:underline">Sign In</a>
			</div>
		</Card.Footer>
	</Card.Root>
</div>
