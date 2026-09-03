<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import * as m from '$lib/paraglide/messages';
	import { cn } from '$lib/utils';
	import {
		ArrowLeft,
		ChevronDown,
		ChevronRight,
		HardDriveDownload,
		LayoutDashboard,
		ListFilter,
		ScrollText,
		Shield,
		Users
	} from '@lucide/svelte';
	import { slide } from 'svelte/transition';

	let { children } = $props();
	let isReleasesExpanded = $state(page.url.pathname.startsWith('/admin/releases'));

	const adminLinks = $derived([
		{ href: '/admin/dashboard', label: m.admin_nav_metrics(), icon: LayoutDashboard },
		{ href: '/admin/users', label: m.admin_nav_users(), icon: Users }
	]);

	const releaseLinks = $derived([
		{
			href: '/admin/releases/installers',
			label: m.admin_releases_category_installers(),
			icon: HardDriveDownload
		},
		{
			href: '/admin/releases/resistance',
			label: m.admin_releases_category_resistance(),
			icon: ScrollText
		},
		{
			href: '/admin/releases/site-packs',
			label: m.admin_releases_category_sitepacks(),
			icon: ListFilter
		}
	]);

	const currentSection = $derived(
		[...adminLinks, ...releaseLinks].find((link) => page.url.pathname === link.href)?.label ??
			m.admin_panel_title()
	);

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<div class="min-h-screen bg-muted/30 lg:flex">
	<aside
		class="hidden w-72 shrink-0 border-r bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col"
	>
		<div class="flex h-20 items-center border-b px-6">
			<a href={resolve('/')} class="flex items-center gap-3 font-semibold">
				<span
					class="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"
				>
					<Shield class="size-5" aria-hidden="true" />
				</span>
				<span class="flex flex-col leading-tight">
					<span>{m.admin_brand()}</span>
					<span class="text-xs font-normal text-muted-foreground"
						>{m.admin_workspace()}</span
					>
				</span>
			</a>
		</div>

		<nav class="flex flex-1 flex-col gap-1 p-4" aria-label={m.admin_navigation_label()}>
			<p
				class="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				{m.admin_nav_overview()}
			</p>
			{#each adminLinks as link (link.href)}
				<a
					href={resolve(link.href)}
					aria-current={isActive(link.href) ? 'page' : undefined}
					class={cn(
						'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
						isActive(link.href)
							? 'bg-primary text-primary-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					<link.icon class="size-4" aria-hidden="true" />
					{link.label}
				</a>
			{/each}

			<div class="mt-3 flex flex-col gap-1">
				<button
					type="button"
					onclick={() => (isReleasesExpanded = !isReleasesExpanded)}
					aria-expanded={isReleasesExpanded}
					class={cn(
						'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
						page.url.pathname.startsWith('/admin/releases')
							? 'bg-muted text-foreground'
							: 'text-muted-foreground hover:bg-muted hover:text-foreground'
					)}
				>
					<span class="flex items-center gap-3">
						<Shield class="size-4" aria-hidden="true" />
						{m.admin_nav_releases()}
					</span>
					{#if isReleasesExpanded}
						<ChevronDown class="size-4" aria-hidden="true" />
					{:else}
						<ChevronRight class="size-4" aria-hidden="true" />
					{/if}
				</button>

				{#if isReleasesExpanded}
					<div
						class="ml-5 flex flex-col gap-1 border-l pl-3"
						transition:slide={{ duration: 160 }}
					>
						{#each releaseLinks as link (link.href)}
							<a
								href={resolve(link.href)}
								aria-current={isActive(link.href) ? 'page' : undefined}
								class={cn(
									'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
									isActive(link.href)
										? 'bg-primary/10 font-medium text-primary'
										: 'text-muted-foreground hover:bg-muted hover:text-foreground'
								)}
							>
								<link.icon class="size-4" aria-hidden="true" />
								{link.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>
		</nav>

		<div class="border-t p-4">
			<a
				href={resolve('/')}
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
			>
				<ArrowLeft class="size-4" aria-hidden="true" />
				{m.admin_back_to_site()}
			</a>
		</div>
	</aside>

	<div class="min-w-0 flex-1">
		<header class="border-b bg-background/95 backdrop-blur lg:sticky lg:top-0 lg:z-10">
			<div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
				<a href={resolve('/')} class="flex items-center gap-2 font-semibold lg:hidden">
					<span
						class="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
					>
						<Shield class="size-4" aria-hidden="true" />
					</span>
					{m.admin_brand()}
				</a>
				<div class="hidden lg:block">
					<p class="text-xs font-medium text-muted-foreground">{m.admin_panel_title()}</p>
					<p class="font-semibold">{currentSection}</p>
				</div>
				<a
					href={resolve('/')}
					class="text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
				>
					{m.admin_exit()}
				</a>
			</div>

			<nav
				class="flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden"
				aria-label={m.admin_navigation_label()}
			>
				{#each [...adminLinks, ...releaseLinks] as link (link.href)}
					<a
						href={resolve(link.href)}
						aria-current={isActive(link.href) ? 'page' : undefined}
						class={cn(
							'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
							isActive(link.href)
								? 'bg-primary text-primary-foreground'
								: 'text-muted-foreground hover:bg-muted hover:text-foreground'
						)}
					>
						{link.label}
					</a>
				{/each}
			</nav>
		</header>

		<main class="p-4 sm:p-6 lg:p-8">
			<div class="mx-auto max-w-[1500px]">
				{@render children()}
			</div>
		</main>
	</div>
</div>
