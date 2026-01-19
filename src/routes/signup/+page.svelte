<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { goto } from '$app/navigation';

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

<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
	<div
		class="w-full max-w-md space-y-8 rounded-lg border bg-white p-8 shadow-lg dark:border-gray-700 dark:bg-gray-800"
	>
		<h2 class="text-center text-3xl font-bold text-gray-900 dark:text-white">Sign Up</h2>
		{#if error}
			<div class="rounded bg-red-100 p-3 text-red-500">{error}</div>
		{/if}
		<form onsubmit={handleSignUp} class="space-y-6">
			<div>
				<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
					>Name</label
				>
				<input
					id="name"
					type="text"
					bind:value={name}
					required
					class="mt-1 block w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					placeholder="John Doe"
				/>
			</div>
			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
					>Email</label
				>
				<input
					id="email"
					type="email"
					bind:value={email}
					required
					class="mt-1 block w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					placeholder="you@example.com"
				/>
			</div>
			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 dark:text-gray-300"
					>Password</label
				>
				<input
					id="password"
					type="password"
					bind:value={password}
					required
					class="mt-1 block w-full rounded border border-gray-300 p-2 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
					placeholder="••••••••"
				/>
			</div>
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{loading ? 'Signing up...' : 'Sign Up'}
			</button>
		</form>
		<p class="text-center text-sm text-gray-600 dark:text-gray-400">
			Already have an account? <a href="/signin" class="text-blue-600 hover:underline">Sign In</a>
		</p>
	</div>
</div>
