<script lang="ts">
	import {
		Shield,
		LayoutDashboard,
		Users,
		ArrowLeft,
		ChevronDown,
		ChevronRight
	} from '@lucide/svelte';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';
	import { slide } from 'svelte/transition';

	let { children } = $props();

	const adminLinks = [
		{ href: '/admin/dashboard', label: 'Metrics', icon: LayoutDashboard },
		{ href: '/admin/users', label: 'User Management', icon: Users }
	];

	const releaseLinks = [
		{ href: '/admin/releases/installers', label: 'Installers' },
		{ href: '/admin/releases/resistance', label: 'Resistance Mode' },
		{ href: '/admin/releases/site-packs', label: 'Site Packs' }
	];

	// Initialize state based on current path
	let isReleasesExpanded = $state(false);

	$effect(() => {
		if (page.url.pathname.includes('/admin/releases')) {
			isReleasesExpanded = true;
		}
	});

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<div class="flex min-h-screen bg-slate-50 dark:bg-background">
	<!-- Admin Sidebar -->
	<aside class="w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-background">
		<div class="flex h-16 items-center px-6">
			<a href="/" class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
				<Shield class="h-6 w-6 text-brand" />
				<span>Ace Admin</span>
			</a>
		</div>

		<nav class="space-y-1 p-4">
			{#each adminLinks as link}
				<a
					href={link.href}
					class={cn(
						'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
						isActive(link.href)
							? 'bg-brand/10 text-amber-600 dark:text-brand'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
					)}
				>
					<link.icon class="h-5 w-5" />
					{link.label}
				</a>
			{/each}

			<!-- Accordion Menu for Software Releases -->
			<div class="pt-1">
				<button
					onclick={() => (isReleasesExpanded = !isReleasesExpanded)}
					class={cn(
						'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
						isReleasesExpanded || page.url.pathname.includes('/admin/releases')
							? 'bg-brand/10 text-amber-600 dark:text-brand'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
					)}
				>
					<div class="flex items-center gap-3">
						<Shield class="h-5 w-5" />
						Software Releases
					</div>
					{#if isReleasesExpanded}
						<ChevronDown class="h-4 w-4" />
					{:else}
						<ChevronRight class="h-4 w-4" />
					{/if}
				</button>

				{#if isReleasesExpanded}
					<div class="mt-1 space-y-1" transition:slide={{ duration: 200 }}>
						{#each releaseLinks as sublink}
							<a
								href={sublink.href}
								class={cn(
									'ml-4 block rounded-r-lg border-l border-border py-1.5 pl-4 text-sm font-medium transition-colors',
									isActive(sublink.href)
										? 'border-brand bg-brand/5 text-brand'
										: 'text-muted-foreground hover:border-slate-400 hover:text-foreground'
								)}
							>
								{sublink.label}
							</a>
						{/each}
					</div>
				{/if}
			</div>

			<div class="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
				<a
					href="/"
					class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900"
				>
					<ArrowLeft class="h-5 w-5" />
					Back to Site
				</a>
			</div>
		</nav>
	</aside>

	<!-- Main Content -->
	<main class="flex-1">
		<header
			class="flex h-16 items-center border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-background"
		>
			<h1 class="text-xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
		</header>

		<div class="p-8">
			{@render children()}
		</div>
	</main>
</div>
