<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import { Download, Crown, Info, LogIn, UserPlus, Shield } from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';

	const session = authClient.useSession();
</script>

<header
	class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex h-16 items-center justify-between mx-auto px-4">
		<div class="flex items-center gap-6 md:gap-10">
			<a href="/" class="flex items-center space-x-2">
				<Shield class="h-6 w-6 text-primary" />
				<span class="inline-block font-bold tracking-tight text-xl">Ace Blocker</span>
			</a>
			<NavigationMenu.Root class="hidden md:flex">
				<NavigationMenu.List class="gap-1">
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/download"
							class="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
						>
							<Download class="mr-2 h-4 w-4" />
							Download
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/get-pro"
							class="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
						>
							<Crown class="mr-2 h-4 w-4 text-yellow-500" />
							Get Pro
						</NavigationMenu.Link>
					</NavigationMenu.Item>
					<NavigationMenu.Item>
						<NavigationMenu.Link
							href="/about"
							class="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50"
						>
							<Info class="mr-2 h-4 w-4" />
							About
						</NavigationMenu.Link>
					</NavigationMenu.Item>
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</div>

		<div class="flex items-center gap-4">
			{#if $session.data}
				<Button href="/dashboard" variant="ghost" size="sm">Dashboard</Button>
				<Button
					onclick={() => authClient.signOut()}
					variant="outline"
					size="sm"
				>
					Sign Out
				</Button>
			{:else}
				<Button href="/signin" variant="ghost" size="sm" class="hidden sm:flex">
					<LogIn class="mr-2 h-4 w-4" />
					Log In
				</Button>
				<Button href="/signup" size="sm">
					<UserPlus class="mr-2 h-4 w-4" />
					Sign Up
				</Button>
			{/if}
		</div>
	</div>
</header>
