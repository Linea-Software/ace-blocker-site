import { createSignal, createMemo, For, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useLocation } from '@solidjs/router';
import { Title } from '@solidjs/meta';
import {
	ArrowLeft,
	ChevronDown,
	ChevronRight,
	HardDriveDownload,
	LayoutDashboard,
	ListFilter,
	ScrollText,
	Gauge,
	Users
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import { basePath } from '$lib/seo';
import { assertAdminSession } from './admin/auth';

const mainLinks = [
	{ href: '/admin/dashboard', label: m.admin_nav_metrics, Icon: LayoutDashboard },
	{ href: '/admin/users', label: m.admin_nav_users, Icon: Users }
];
const releaseLinks = [
	{
		href: '/admin/releases/installers',
		label: m.admin_releases_category_installers,
		Icon: HardDriveDownload
	},
	{
		href: '/admin/releases/resistance',
		label: m.admin_releases_category_resistance,
		Icon: ScrollText
	},
	{
		href: '/admin/releases/site-packs',
		label: m.admin_releases_category_sitepacks,
		Icon: ListFilter
	}
];

export default function AdminLayout(props: { children?: JSX.Element }) {
	const location = useLocation();
	// Layout is not the security boundary: every data query independently checks admin role.
	// This prevents unauthenticated SSR from rendering even the admin navigation.
	const allowed = createMemo(() => assertAdminSession());
	const [expanded, setExpanded] = createSignal(() =>
		location.pathname.startsWith('/admin/releases')
	);
	const active = (href: string) => basePath(location.pathname) === href;
	const pageTitle = () =>
		(
			({
				'/admin/dashboard': m.admin_metrics_page_title,
				'/admin/users': m.admin_users_page_title,
				'/admin/releases/installers': m.admin_releases_installers_page_title,
				'/admin/releases/resistance': m.admin_releases_resistance_page_title,
				'/admin/releases/site-packs': m.admin_releases_site_packs_page_title
			})[basePath(location.pathname)] ?? m.admin_panel_title
		)();
	const currentSection = () =>
		[...mainLinks, ...releaseLinks].find((link) => active(link.href))?.label() ??
		m.admin_panel_title();
	const linkClass = (href: string, sub = false) =>
		[
			'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
			active(href)
				? sub
					? 'bg-primary/10 text-primary'
					: 'bg-primary text-primary-foreground'
				: 'text-muted-foreground hover:bg-muted hover:text-foreground'
		].join(' ');
	return (
		<>
			<Title>{pageTitle()}</Title>
			<Show when={allowed()}>
				<div class="min-h-screen bg-muted/30 lg:flex">
					<aside class="hidden w-72 shrink-0 border-r border-border bg-card lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
						<div class="flex h-20 items-center border-b px-6">
							<a href="/" class="flex items-center gap-3 font-semibold">
								<span class="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
									<Gauge class="size-5" />
								</span>
								<span class="flex flex-col leading-tight">
									<span>{m.admin_brand()}</span>
									<span class="text-xs font-normal text-muted-foreground">
										{m.admin_workspace()}
									</span>
								</span>
							</a>
						</div>
						<nav
							class="flex flex-1 flex-col gap-1 p-4"
							aria-label={m.admin_navigation_label()}
						>
							<p class="px-3 pb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
								{m.admin_nav_overview()}
							</p>
							<For each={mainLinks}>
								{(link) => (
									<a
										href={link.href}
										aria-current={active(link.href) ? 'page' : undefined}
										class={linkClass(link.href)}
									>
										<link.Icon class="size-4" />
										{link.label()}
									</a>
								)}
							</For>
							<div class="mt-3 flex flex-col gap-1">
								<button
									type="button"
									onClick={() => setExpanded((value) => !value)}
									aria-expanded={expanded() ? 'true' : 'false'}
									class={linkClass('/admin/releases')}
								>
									<span class="flex items-center gap-3">
										<Gauge class="size-4" />
										{m.admin_nav_releases()}
									</span>
									<Show
										when={expanded()}
										fallback={<ChevronRight class="size-4" />}
									>
										<ChevronDown class="size-4" />
									</Show>
								</button>
								<Show when={expanded()}>
									<div class="ml-5 flex flex-col gap-1 border-l pl-3">
										<For each={releaseLinks}>
											{(link) => (
												<a
													href={link.href}
													aria-current={
														active(link.href) ? 'page' : undefined
													}
													class={linkClass(link.href, true)}
												>
													<link.Icon class="size-4" />
													{link.label()}
												</a>
											)}
										</For>
									</div>
								</Show>
							</div>
						</nav>
						<div class="border-t p-4">
							<a
								href="/"
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
							>
								<ArrowLeft class="size-4" />
								{m.admin_back_to_site()}
							</a>
						</div>
					</aside>
					<div class="min-w-0 flex-1">
						<header class="border-b border-border bg-background lg:sticky lg:top-0 lg:z-10">
							<div class="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
								<a href="/" class="flex items-center gap-2 font-semibold lg:hidden">
									<Gauge class="size-5" />
									{m.admin_brand()}
								</a>
								<div class="hidden lg:block">
									<p class="text-xs font-medium text-muted-foreground">
										{m.admin_panel_title()}
									</p>
									<p class="font-semibold">{currentSection()}</p>
								</div>
								<a
									href="/"
									class="text-sm font-medium text-muted-foreground hover:text-foreground lg:hidden"
								>
									{m.admin_exit()}
								</a>
							</div>
							<nav
								class="flex gap-1 overflow-x-auto border-t px-4 py-2 lg:hidden"
								aria-label={m.admin_navigation_label()}
							>
								<For each={[...mainLinks, ...releaseLinks]}>
									{(link) => (
										<a
											href={link.href}
											aria-current={active(link.href) ? 'page' : undefined}
											class={
												'shrink-0 rounded-md px-3 py-1.5 text-sm font-medium ' +
												(active(link.href)
													? 'bg-primary text-primary-foreground'
													: 'text-muted-foreground hover:bg-muted')
											}
										>
											{link.label()}
										</a>
									)}
								</For>
							</nav>
						</header>
						<main class="min-w-0 p-4 sm:p-6 lg:p-8">
							<div class="mx-auto max-w-[1500px] min-w-0">{props.children}</div>
						</main>
					</div>
				</div>
			</Show>
		</>
	);
}
