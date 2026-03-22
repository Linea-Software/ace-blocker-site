<script lang="ts">
	import { Shield, LayoutDashboard, Users, ArrowLeft } from '@lucide/svelte';
	import { page } from '$app/state';
	import { cn } from '$lib/utils';

	let { children } = $props();

	const adminLinks = [
		{ href: '/admin/dashboard', label: 'Metrics', icon: LayoutDashboard },
		{ href: '/admin/users', label: 'User Management', icon: Users },
		{ href: '/admin/releases', label: 'Software Releases', icon: Shield }
	];

	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<div class="flex min-h-screen bg-slate-50 dark:bg-[#0B0B0F]">
	<!-- Admin Sidebar -->
	<aside
		class="w-64 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0B0B0F]"
	>
		<div class="flex h-16 items-center px-6">
			<a href="/" class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
				<Shield class="h-6 w-6 text-amber-500" />
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
							? 'bg-amber-500/10 text-amber-600 dark:text-amber-500'
							: 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-900'
					)}
				>
					<link.icon class="h-5 w-5" />
					{link.label}
				</a>
			{/each}

			<div class="pt-4 mt-4 border-t border-slate-200 dark:border-slate-800">
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
			class="flex h-16 items-center border-b border-slate-200 bg-white px-8 dark:border-slate-800 dark:bg-[#0B0B0F]"
		>
			<h1 class="text-xl font-bold text-slate-900 dark:text-white">Admin Panel</h1>
		</header>

		<div class="p-8">
			{@render children()}
		</div>
	</main>
</div>
