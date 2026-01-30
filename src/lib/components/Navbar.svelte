<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';
	import * as Sheet from '$lib/components/ui/sheet';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Download,
		Crown,
		Info,
		LogIn,
		UserPlus,
		Shield,
		Menu,
		LayoutDashboard,
		LogOut
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';

	const session = authClient.useSession();

	const navLinks = [
		{ href: '/download', label: 'Download', icon: Download },
		{ href: '/get-pro', label: 'Get Pro', icon: Crown, iconClass: 'text-yellow-500' },
		{ href: '/about', label: 'About', icon: Info }
	];

	let isMobileMenuOpen = $state(false);

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="container flex h-16 items-center justify-between mx-auto px-4">
		<div class="flex items-center gap-4 md:gap-8">
			<!-- Mobile Menu Button -->
			<Sheet.Root bind:open={isMobileMenuOpen}>
				<Sheet.Trigger
					class="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
				>
					<Menu class="h-6 w-6" />
					<span class="sr-only">Toggle menu</span>
				</Sheet.Trigger>
				<Sheet.Content side="left" class="w-[300px] sm:w-[400px] flex flex-col">
					<Sheet.Header class="text-left">
						<Sheet.Title class="flex items-center gap-2">
							<Shield class="h-6 w-6 text-primary" />
							<span>Ace Blocker</span>
						</Sheet.Title>
						<Sheet.Description>Manage your digital well-being.</Sheet.Description>
					</Sheet.Header>
					<div class="flex flex-col gap-4 py-8 flex-1">
						{#each navLinks as link}
							<a
								href={link.href}
								class={cn(
									'flex items-center gap-3 px-3 py-2 text-lg font-medium transition-colors hover:text-primary rounded-md',
									isActive(link.href) ? 'bg-accent text-primary' : 'text-muted-foreground'
								)}
								onclick={() => (isMobileMenuOpen = false)}
							>
								<link.icon class={cn('h-5 w-5', link.iconClass)} />
								{link.label}
							</a>
						{/each}
						<Separator />
						{#if $session.data}
							<a
								href="/dashboard"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<LayoutDashboard class="h-5 w-5" />
								Dashboard
							</a>
							<button
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-destructive transition-colors hover:bg-destructive/10 rounded-md"
								onclick={() => {
									authClient.signOut();
									isMobileMenuOpen = false;
								}}
							>
								<LogOut class="h-5 w-5" />
								Sign Out
							</button>
						{:else}
							<a
								href="/signin"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<LogIn class="h-5 w-5" />
								Log In
							</a>
							<a
								href="/signup"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-primary transition-colors hover:text-primary/80"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<UserPlus class="h-5 w-5" />
								Sign Up
							</a>
						{/if}
					</div>
				</Sheet.Content>
			</Sheet.Root>

			<a href="/" class="flex items-center space-x-2 transition-opacity hover:opacity-90">
				<Shield class="h-6 w-6 text-primary" />
				<span class="inline-block font-bold tracking-tight text-xl sm:text-2xl">Ace Blocker</span>
			</a>

			<NavigationMenu.Root class="hidden md:flex">
				<NavigationMenu.List class="gap-1">
					{#each navLinks as link}
						<NavigationMenu.Item>
							<NavigationMenu.Link
								href={link.href}
								class={cn(
									'group inline-flex h-9 w-max items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50',
									isActive(link.href) ? 'bg-accent text-primary' : 'bg-background'
								)}
							>
								<link.icon class={cn('mr-2 h-4 w-4', link.iconClass)} />
								{link.label}
							</NavigationMenu.Link>
						</NavigationMenu.Item>
					{/each}
				</NavigationMenu.List>
			</NavigationMenu.Root>
		</div>

		<div class="flex items-center gap-2 sm:gap-4">
			{#if $session.data}
				<Button href="/dashboard" variant="ghost" size="sm" class="hidden sm:flex">
					Dashboard
				</Button>
				<Button
					onclick={() => authClient.signOut()}
					variant="outline"
					size="sm"
					class="hidden sm:flex"
				>
					Sign Out
				</Button>
			{:else}
				<Button href="/signin" variant="ghost" size="sm" class="hidden sm:flex">
					Log In
				</Button>
				<Button href="/signup" size="sm">
					<span class="hidden sm:inline">Sign Up</span>
					<span class="sm:hidden text-xs">Join</span>
				</Button>
			{/if}
		</div>
	</div>
</header>
