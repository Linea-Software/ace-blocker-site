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
		Menu,
		LayoutDashboard,
		LogOut,
		Sun,
		Moon,
		User
	} from '@lucide/svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import darkFullLogo from '$lib/assets/logo/SVG/dark-full-logo.svg';
	import lightFullLogo from '$lib/assets/logo/SVG/light-full-logo.svg';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { cn } from '$lib/utils';
	import { toggleMode, mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';

	let { isPro = false } = $props();
	const session = authClient.useSession();

	const navLinks = [
		{ href: '/download' as const, label: m.nav_download(), icon: Download },
		{ href: '/about' as const, label: m.nav_about(), icon: Info }
	];

	let isMobileMenuOpen = $state(false);
	let isDark = $derived(mode.current === 'dark');

	const userInitial = $derived(
		$session.data?.user
			? ($session.data.user.name?.[0] ?? $session.data.user.email[0]).toUpperCase()
			: '?'
	);

	const userDisplayName = $derived($session.data?.user?.name ?? $session.data?.user?.email ?? '');
	const userDisplayEmail = $derived($session.data?.user?.email ?? '');

	function isActive(href: string) {
		return page.url.pathname === href;
	}

	async function handleSignOut() {
		await authClient.signOut();
		window.location.reload();
	}
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-slate-800 dark:bg-background/95 supports-[backdrop-filter]:dark:bg-background/60"
>
	<div class="container mx-auto flex h-16 items-center justify-between px-4">
		<div class="flex h-full items-center gap-4">
			<!-- Mobile Menu Button -->
			<Sheet.Root bind:open={isMobileMenuOpen}>
				<Sheet.Trigger
					class="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground md:hidden"
				>
					<Menu class="h-5 w-5" />
					<span class="sr-only">{m.nav_toggle_menu()}</span>
				</Sheet.Trigger>
				<Sheet.Content side="left" class="flex w-[300px] flex-col sm:w-[400px]">
					<Sheet.Header class="text-left">
						<Sheet.Title class="flex items-center gap-2">
							{#if isDark}
								<img src={darkFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
							{:else}
								<img src={lightFullLogo} alt="Ace Blocker" class="h-6 w-auto" />
							{/if}
						</Sheet.Title>
						<Sheet.Description>{m.nav_menu_description()}</Sheet.Description>
					</Sheet.Header>
					<div class="flex flex-1 flex-col gap-4 py-8">
						{#each navLinks as link (link.href)}
							<a
								href={resolve(link.href)}
								class={cn(
									'flex items-center gap-3 rounded-md px-3 py-2 text-lg font-medium transition-colors hover:text-primary',
									isActive(link.href)
										? 'bg-accent text-primary'
										: 'text-muted-foreground'
								)}
								onclick={() => (isMobileMenuOpen = false)}
							>
								<link.icon class="h-5 w-5" />
								{link.label}
							</a>
						{/each}

						{#if isPro}
							<a
								href={resolve('/get-pro')}
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-brand transition-colors hover:bg-brand/10"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<Crown class="h-5 w-5" />
								{m.nav_pro_features()}
							</a>
						{:else}
							<a
								href={resolve('/get-pro')}
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-primary transition-colors hover:text-primary/80"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<Crown class="h-5 w-5 text-brand" />
								{m.account_get_pro()}
							</a>
						{/if}

						<Separator />
						{#if $session.data}
							<a
								href={resolve('/account')}
								class="flex items-center gap-3 rounded-md px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<User class="h-5 w-5" />
								{m.account_settings()}
							</a>
							{#if $session.data?.user.role === 'admin'}
								<a
									href={resolve('/admin/dashboard')}
									class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
									onclick={() => (isMobileMenuOpen = false)}
								>
									<LayoutDashboard class="h-5 w-5" />
									{m.nav_admin_dashboard()}
								</a>
							{/if}
							<button
								class="flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-lg font-medium text-destructive transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-95"
								onclick={() => {
									handleSignOut();
									isMobileMenuOpen = false;
								}}
							>
								<LogOut class="h-5 w-5" />
								{m.sign_out()}
							</button>
						{:else}
							<a
								href={resolve('/signin')}
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<LogIn class="h-5 w-5" />
								{m.nav_log_in()}
							</a>
							<a
								href={resolve('/signup')}
								class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-primary transition-colors hover:text-primary/80"
								onclick={() => (isMobileMenuOpen = false)}
							>
								<UserPlus class="h-5 w-5" />
								{m.nav_sign_up()}
							</a>
						{/if}

						<Separator />

						<button
							class="flex items-center gap-3 px-3 py-2 text-lg font-medium text-muted-foreground transition-colors hover:text-primary"
							onclick={toggleMode}
						>
							{#if mode.current === 'dark'}
								<Sun class="h-5 w-5" />
								{m.nav_light_mode()}
							{:else}
								<Moon class="h-5 w-5" />
								{m.nav_dark_mode()}
							{/if}
						</button>
					</div>
				</Sheet.Content>
			</Sheet.Root>

			<a
				href={resolve('/')}
				class="mr-4 flex items-center transition-opacity hover:opacity-90"
			>
				{#if isDark}
					<img src={darkFullLogo} alt="Ace Blocker" class="h-[30px] w-auto md:h-9" />
				{:else}
					<img src={lightFullLogo} alt="Ace Blocker" class="h-[30px] w-auto md:h-9" />
				{/if}
			</a>

			<nav class="hidden h-full items-center gap-1 md:flex">
				{#each navLinks as link (link.href)}
					<a
						href={resolve(link.href)}
						class={cn(
							'inline-flex h-9 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent focus:bg-accent focus:outline-none disabled:pointer-events-none disabled:opacity-50',
							isActive(link.href)
								? 'bg-accent text-primary dark:text-brand'
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
				aria-label={m.nav_toggle_theme()}
			>
				<Sun
					class="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"
				/>
				<Moon
					class="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"
				/>
				<span class="sr-only">{m.nav_toggle_theme()}</span>
			</Button>

			{#if $session.data}
				{#if isPro}
					<a
						href={resolve('/get-pro')}
						class="hidden items-center gap-2 px-3 text-sm font-medium text-brand transition-colors hover:text-amber-400 sm:flex"
					>
						<Crown class="h-4 w-4" />
						{m.nav_pro_features()}
					</a>
				{:else}
					<Button
						href={resolve('/get-pro')}
						class="hidden items-center bg-slate-900 text-white hover:bg-slate-800 sm:inline-flex dark:bg-brand dark:text-slate-950 dark:hover:bg-amber-400"
					>
						<Crown class="mr-2 h-4 w-4" />
						{m.account_get_pro()}
					</Button>
				{/if}

				{#if $session.data?.user.role === 'admin'}
					<Button
						href={resolve('/admin/dashboard')}
						variant="ghost"
						class="hidden items-center text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-white"
					>
						{m.nav_admin_dashboard()}
					</Button>
				{/if}

				<DropdownMenu.DropdownMenu>
					<DropdownMenu.Trigger
						class="hidden h-9 w-9 items-center justify-center rounded-full border border-brand/20 bg-brand/15 text-sm font-medium text-amber-600 sm:inline-flex dark:text-amber-400"
					>
						{userInitial}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-56" align="end">
						<DropdownMenu.Label class="font-normal">
							<span class="block text-sm font-medium">{userDisplayName}</span>
							<span class="block text-xs text-muted-foreground"
								>{userDisplayEmail}</span
							>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							class="cursor-pointer"
							onclick={() => goto(resolve('/account'))}
						>
							<User class="mr-2 h-4 w-4" />
							{m.account_settings()}
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class="cursor-pointer text-destructive"
							onclick={() => handleSignOut()}
						>
							<LogOut class="mr-2 h-4 w-4" />
							{m.sign_out()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.DropdownMenu>
			{:else}
				<Button
					href={resolve('/get-pro')}
					variant="outline"
					size="sm"
					class={cn(
						'hidden items-center border-brand/50 text-amber-700 hover:bg-brand/10 md:inline-flex dark:text-brand',
						isActive('/get-pro') && 'bg-brand/10'
					)}
				>
					<Crown class="mr-2 h-4 w-4" />
					{m.account_get_pro()}
				</Button>
				<Button
					href={resolve('/signin')}
					variant="ghost"
					class="hidden items-center text-slate-600 hover:text-slate-900 sm:inline-flex dark:text-slate-300 dark:hover:text-white"
				>
					{m.nav_log_in()}
				</Button>
				<Button
					href={resolve('/signup')}
					class="inline-flex items-center bg-slate-900 text-white hover:bg-slate-800 sm:px-6 dark:bg-brand dark:text-slate-950 dark:hover:bg-amber-400"
				>
					<span class="hidden sm:inline">{m.nav_sign_up()}</span>
					<span class="px-2 text-xs sm:hidden">{m.nav_join()}</span>
				</Button>
			{/if}
		</div>
	</div>
</header>
