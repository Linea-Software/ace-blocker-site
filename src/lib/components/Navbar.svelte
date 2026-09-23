<script lang="ts">
	import * as Sheet from '$lib/components/ui/sheet';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import {
		Download,
		Gauge,
		Info,
		LayoutDashboard,
		LogIn,
		LogOut,
		Menu,
		Moon,
		Sun,
		User,
		UserPlus
	} from '@lucide/svelte';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toggleMode, mode } from 'mode-watcher';
	import * as m from '$lib/paraglide/messages';

	let { isPro = false } = $props();
	const session = authClient.useSession();

	const navLinks = [
		{ href: '/download' as const, label: m.nav_download(), icon: Download },
		{ href: '/about' as const, label: m.nav_about(), icon: Info }
	];

	let isMobileMenuOpen = $state(false);
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

<a
	href="#main-content"
	class="sr-only fixed top-3 left-3 z-[100] rounded-md bg-foreground px-4 py-3 font-medium text-background focus:not-sr-only"
>
	{m.skip_to_content()}
</a>

<header class="sticky top-0 z-50 border-b border-border bg-background">
	<div class="ace-shell flex h-16 items-center justify-between gap-4">
		<div class="flex min-w-0 items-center gap-3 md:gap-8">
			<Sheet.Root bind:open={isMobileMenuOpen}>
				<Sheet.Trigger
					class="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card hover:bg-accent md:hidden"
					aria-label={m.nav_toggle_menu()}
				>
					<Menu class="size-5" aria-hidden="true" />
				</Sheet.Trigger>
				<Sheet.Content
					side="left"
					class="flex w-[min(92vw,24rem)] flex-col rounded-none border-r border-border bg-background p-0 shadow-none"
				>
					<Sheet.Header class="border-b border-border px-5 py-5 text-left">
						<Sheet.Title>
							<BrandLogo alt={m.about_hero_app()} class="h-7 w-auto" />
						</Sheet.Title>
						<Sheet.Description class="mt-2 max-w-xs text-sm">
							{m.nav_menu_description()}
						</Sheet.Description>
					</Sheet.Header>

					<nav class="flex flex-1 flex-col" aria-label={m.nav_toggle_menu()}>
						{#each navLinks as link (link.href)}
							<a
								href={resolve(link.href)}
								class={[
									'flex min-h-14 items-center gap-3 border-b border-border px-5 text-base font-medium',
									isActive(link.href)
										? 'bg-accent text-foreground'
										: 'text-muted-foreground'
								]}
								onclick={() => (isMobileMenuOpen = false)}
							>
								<link.icon class="size-4" aria-hidden="true" />
								{link.label}
							</a>
						{/each}
						<a
							href={resolve('/get-pro')}
							class={[
								'flex min-h-14 items-center gap-3 border-b border-border px-5 text-base font-medium',
								isActive('/get-pro')
									? 'bg-accent text-foreground'
									: 'text-muted-foreground'
							]}
							onclick={() => (isMobileMenuOpen = false)}
						>
							<Gauge class="size-4" aria-hidden="true" />
							{isPro ? m.nav_pro_features() : m.account_get_pro()}
						</a>

						<div class="mt-auto border-t border-border">
							{#if $session.data}
								<a
									href={resolve('/account')}
									class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
									onclick={() => (isMobileMenuOpen = false)}
								>
									<User class="size-4" aria-hidden="true" />
									{m.account_settings()}
								</a>
								{#if $session.data.user.role === 'admin'}
									<a
										href={resolve('/admin/dashboard')}
										class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
										onclick={() => (isMobileMenuOpen = false)}
									>
										<LayoutDashboard class="size-4" aria-hidden="true" />
										{m.nav_admin_dashboard()}
									</a>
								{/if}
								<button
									type="button"
									class="flex min-h-14 w-full items-center gap-3 border-b border-border px-5 text-left font-medium text-destructive hover:bg-destructive/10"
									onclick={() => {
										handleSignOut();
										isMobileMenuOpen = false;
									}}
								>
									<LogOut class="size-4" aria-hidden="true" />
									{m.sign_out()}
								</button>
							{:else}
								<a
									href={resolve('/signin')}
									class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
									onclick={() => (isMobileMenuOpen = false)}
								>
									<LogIn class="size-4" aria-hidden="true" />
									{m.nav_log_in()}
								</a>
								<a
									href={resolve('/signup')}
									class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
									onclick={() => (isMobileMenuOpen = false)}
								>
									<UserPlus class="size-4" aria-hidden="true" />
									{m.nav_sign_up()}
								</a>
							{/if}
							<button
								type="button"
								class="flex min-h-14 w-full items-center gap-3 px-5 text-left font-medium"
								onclick={toggleMode}
							>
								{#if mode.current === 'dark'}
									<Sun class="size-4" aria-hidden="true" />
									{m.nav_light_mode()}
								{:else}
									<Moon class="size-4" aria-hidden="true" />
									{m.nav_dark_mode()}
								{/if}
							</button>
						</div>
					</nav>
				</Sheet.Content>
			</Sheet.Root>

			<a href={resolve('/')} class="shrink-0">
				<BrandLogo alt={m.about_hero_app()} class="h-[29px] w-auto md:h-8" />
			</a>

			<nav class="hidden h-16 items-stretch md:flex" aria-label={m.nav_toggle_menu()}>
				{#each navLinks as link (link.href)}
					<a
						href={resolve(link.href)}
						class={[
							'relative flex items-center border-x border-transparent px-4 text-sm font-medium text-muted-foreground hover:text-foreground',
							isActive(link.href) && 'border-border bg-card text-foreground'
						]}
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</div>

		<div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
			<a
				href={resolve('/get-pro')}
				class={[
					'hidden min-h-10 items-center rounded-md border px-3 text-sm font-medium sm:inline-flex',
					isActive('/get-pro')
						? 'border-foreground bg-foreground text-background'
						: 'border-border bg-card hover:bg-accent'
				]}
			>
				{isPro ? m.nav_pro_features() : m.account_get_pro()}
			</a>

			<button
				type="button"
				class="relative inline-flex size-10 items-center justify-center rounded-md border border-border bg-card hover:bg-accent"
				onclick={toggleMode}
				aria-label={m.nav_toggle_theme()}
			>
				{#if mode.current === 'dark'}
					<Sun class="size-4" aria-hidden="true" />
				{:else}
					<Moon class="size-4" aria-hidden="true" />
				{/if}
			</button>

			{#if $session.data}
				{#if $session.data.user.role === 'admin'}
					<a
						href={resolve('/admin/dashboard')}
						class="hidden min-h-10 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
					>
						{m.nav_admin_dashboard()}
					</a>
				{/if}

				<DropdownMenu.DropdownMenu>
					<DropdownMenu.Trigger
						class="inline-flex size-10 items-center justify-center rounded-md border border-foreground/25 bg-card font-mono text-xs font-medium hover:bg-accent"
						aria-label={m.account_settings()}
					>
						{userInitial}
					</DropdownMenu.Trigger>
					<DropdownMenu.Content
						class="w-60 rounded-md border-border shadow-none"
						align="end"
					>
						<DropdownMenu.Label class="font-normal">
							<span class="block truncate text-sm font-medium">{userDisplayName}</span
							>
							<span class="block truncate text-xs text-muted-foreground"
								>{userDisplayEmail}</span
							>
						</DropdownMenu.Label>
						<DropdownMenu.Separator />
						<DropdownMenu.Item
							class="cursor-pointer"
							onclick={() => goto(resolve('/account'))}
						>
							<User class="mr-2 size-4" aria-hidden="true" />
							{m.account_settings()}
						</DropdownMenu.Item>
						<DropdownMenu.Item
							class="cursor-pointer text-destructive focus:text-destructive"
							onclick={handleSignOut}
						>
							<LogOut class="mr-2 size-4" aria-hidden="true" />
							{m.sign_out()}
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.DropdownMenu>
			{:else}
				<a
					href={resolve('/signin')}
					class="hidden min-h-10 items-center px-2 text-sm font-medium sm:inline-flex"
				>
					{m.nav_log_in()}
				</a>
				<a
					href={resolve('/signup')}
					class="inline-flex min-h-10 items-center rounded-md bg-foreground px-3.5 text-sm font-medium text-background hover:opacity-90"
				>
					<span class="hidden sm:inline">{m.nav_sign_up()}</span>
					<span class="sm:hidden">{m.nav_join()}</span>
				</a>
			{/if}
		</div>
	</div>
</header>
