<script lang="ts">
	import { Button } from '$lib/components/ui/button';
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
		LogOut,
		Sun,
		Moon
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { toggleMode, mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';
	import { apiClient } from '$lib/api-client';

	let { isPro = false } = $props();
	const session = authClient.useSession();

	const navLinks = [
		{ href: '/download', label: 'Download', icon: Download },
		{ href: '/about', label: 'About', icon: Info }
	];

	let isMobileMenuOpen = $state(false);

	function isActive(href: string) {
		return page.url.pathname === href;
	}

	async function handleSignOut() {
		await authClient.signOut();
		window.location.reload();
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-[#0B0B0F]/95 supports-[backdrop-filter]:dark:bg-[#0B0B0F]/60"
>
	<div class="container mx-auto flex h-16 items-center justify-between px-4">
		<div class="flex h-full items-center gap-4">
			<!-- Mobile Menu Button -->
			<Sheet.Root bind:open={isMobileMenuOpen}>
				<Sheet.Trigger
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
				>
					<Menu class="h-5 w-5" />
					<span class="sr-only">Toggle menu</span>
				</Sheet.Trigger>
				<Sheet.Content side="left" class="flex w-[300px] flex-col sm:w-[400px]">
					<Sheet.Header class="text-left">
						<Sheet.Title class="flex items-center gap-2">
							<Shield class="h-6 w-6 text-primary" />
							<span>Ace Blocker</span>
						</Sheet.Title>
						<Sheet.Description>Manage your digital well-being.</Sheet.Description>
					</Sheet.Header>
					<div class="flex flex-1 flex-col gap-4 py-8">
						{#each navLinks as link}
							<a
								href={link.href}
								class={cn(
									'flex items-center gap-3 rounded-md px-3 py-2 text-lg font-medium transition-colors hover:text-primary',
									isActive(link.href) ? 'bg-accent text-primary' : 'text-muted-foreground'
								)}
								onclick={() => (isMobileMenuOpen = false)}
							>
								<link.icon class="h-5 w-5" />
								{link.label}
							</a>
						{/each}

						{#if isPro}
							<a
								href="/get-pro"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-amber-500 transition-colors hover:bg-amber-500/10"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<Crown class="h-5 w-5" />
								{m.nav_pro_features()}
							</a>
						{:else}
							<a
								href="/get-pro"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-primary transition-colors hover:text-primary/80"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<Crown class="h-5 w-5 text-amber-500" />
								Get Pro
							</a>
						{/if}

						<Separator />
						{#if $session.data?.user.role === 'admin'}
							<a
								href="/admin/dashboard"
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<LayoutDashboard class="h-5 w-5" />
								Admin Dashboard
							</a>
							<button
								class="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-lg font-medium text-destructive transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-95"
								onclick={() => {
									handleSignOut();
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

						<Separator />

						<button
							class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
							onclick={toggleMode}
						>
							{#if mode.current === 'dark'}
								<Sun class="h-5 w-5" />
								Light Mode
							{:else}
								<Moon class="h-5 w-5" />
								Dark Mode
							{/if}
						</button>
					</div>
				</Sheet.Content>
			</Sheet.Root>

			<a href="/" class="mr-4 flex items-center space-x-2 transition-opacity hover:opacity-90">
				<Shield class="h-6 w-6 text-primary dark:text-amber-500" />
				<span
					class="inline-block text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-white"
					>Ace Blocker</span
				>
			</a>

			<nav class="hidden h-full items-center gap-1 md:flex">
				{#each navLinks as link}
					<a
						href={link.href}
						class={cn(
							'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent focus:outline-none disabled:pointer-events-none disabled:opacity-50',
							isActive(link.href)
								? 'bg-accent text-primary dark:text-amber-500'
								: 'text-slate-600 dark:text-slate-400 dark:hover:text-white'
						)}
					>
						<link.icon class="mr-2 h-4 w-4" />
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="flex h-full items-center gap-2 sm:gap-4">
			<Button
				variant="ghost"
				size="icon"
				class="h-9 w-9 rounded-md text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
				onclick={toggleMode}
				aria-label="Toggle theme"
			>
				<Sun
					class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
				/>
				<Moon
					class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">Toggle theme</span>
			</Button>

			{#if $session.data}
				{#if isPro}
					<a
						href="/get-pro"
						class="hidden items-center gap-2 px-3 text-sm font-medium text-amber-500 transition-colors hover:text-amber-400 sm:flex"
					>
						<Crown class="h-4 w-4" />
						{m.nav_pro_features()}
					</a>
				{:else}
					<Button
						href="/get-pro"
						class="hidden items-center bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
					>
						<Crown class="mr-2 h-4 w-4" />
						Get Pro
					</Button>
				{/if}

				{#if $session.data?.user.role === 'admin'}
					<Button
						href="/admin/dashboard"
						variant="ghost"
						class="hidden items-center text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-white"
					>
						Admin Dashboard
					</Button>
				{/if}
				<Button
					onclick={() => handleSignOut()}
					variant="ghost"
					class="hidden items-center text-destructive transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-95 sm:inline-flex"
				>
					<LogOut class="mr-2 h-4 w-4" />
					Sign Out
				</Button>
			{:else}
				<Button
					href="/signin"
					variant="ghost"
					class="hidden items-center text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-white"
				>
					Log In
				</Button>
				<Button
					href="/signup"
					class="inline-flex items-center bg-slate-900 text-white hover:bg-slate-800 sm:px-6 dark:bg-amber-500 dark:text-slate-950 dark:hover:bg-amber-400"
				>
					<span class="hidden sm:inline">Sign Up</span>
					<span class="px-2 text-xs sm:hidden">Join</span>
				</Button>
			{/if}
		</div>
	</div>
</header>
