import { createEffect, createMemo, createSignal, For, onSettled, Show } from 'solid-js';
import { useLocation } from '@solidjs/router';
import {
	ArrowUpRight,
	BookOpen,
	ChevronDown,
	Download,
	Gauge,
	Info,
	LayoutDashboard,
	LogIn,
	LogOut,
	Menu,
	Moon,
	Settings,
	Sun,
	User,
	UserPlus
} from '@lucide/solid';
import BrandLogo from './BrandLogo';
import LanguageSelector from './LanguageSelector';
import { languageSwitchHref, type AvailableSiteLocale } from './language-switch';
import { authClient } from '$lib/auth-client';
import { getNavbarPro } from '$lib/navbar-pro';
import { localizeHref } from '$lib/paraglide/runtime';
import { basePath } from '$lib/seo';
import * as m from '$lib/paraglide/messages.js';

const languages: { locale: AvailableSiteLocale; label: string }[] = [
	{ locale: 'en', label: 'English' },
	{ locale: 'it', label: 'Italiano' },
	{ locale: 'de', label: 'Deutsch' },
	{ locale: 'es', label: 'Español' }
];
function toggleTheme() {
	const root = document.documentElement;
	const mode = root.classList.contains('dark') ? 'light' : 'dark';
	root.classList.toggle('dark', mode === 'dark');
	root.style.colorScheme = mode;
	localStorage.setItem('mode', mode);
	document.cookie = 'mode=' + mode + '; path=/; SameSite=Lax';
}
export default function Navbar(props: { isPro?: boolean }) {
	const loc = useLocation();
	const session = authClient.useSession();
	const serverPro = createMemo(() => getNavbarPro());
	const isPro = () => Boolean(props.isPro || serverPro());
	const [mobile, setMobile] = createSignal(false);
	const [openMenu, setOpenMenu] = createSignal<'settings' | 'account' | null>(null);
	const [dark, setDark] = createSignal(false);
	let menuTrigger: HTMLButtonElement | undefined;
	let mobileTrigger: HTMLButtonElement | undefined;
	let drawer: HTMLElement | undefined;
	let settingsMenu: HTMLDivElement | undefined, accountMenu: HTMLDivElement | undefined;
	const links = [
		{ href: '/download', label: m.nav_download(), icon: Download },
		{ href: '/about', label: m.nav_about(), icon: Info },
		{ href: '/faq', label: m.nav_faq(), icon: BookOpen }
	];
	const active = (href: string) => basePath(loc.pathname) === href;
	const href = (path: string) => localizeHref(path);
	const user = () => session()?.data?.user;
	const initial = () =>
		user() ? (user()?.name?.[0] ?? user()?.email?.[0] ?? '?').toUpperCase() : '?';
	const activeLocale = () => loc.pathname.match(/^\/(it|de|es)(?:\/|$)/)?.[1] ?? 'en';
	const currentDark = () => dark();
	function changeLanguage(locale: AvailableSiteLocale) {
		if (locale !== activeLocale())
			window.location.assign(languageSwitchHref(new URL(window.location.href), locale));
	}
	function flipTheme() {
		toggleTheme();
		setDark(document.documentElement.classList.contains('dark'));
		setOpenMenu(null);
	}
	async function signOut() {
		await authClient.signOut();
		window.location.reload();
	}
	function closeMobile() {
		setMobile(false);
		mobileTrigger?.focus();
	}
	function keyTrap(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			closeMobile();
			return;
		}
		if (e.key !== 'Tab' || !drawer) return;
		const focusable = [
			...drawer.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')
		];
		if (!focusable.length) {
			e.preventDefault();
			return;
		}
		const first = focusable[0],
			last = focusable[focusable.length - 1];
		if (e.shiftKey && document.activeElement === first) {
			e.preventDefault();
			last.focus();
		}
		if (!e.shiftKey && document.activeElement === last) {
			e.preventDefault();
			first.focus();
		}
	}
	function menuKeys(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			e.preventDefault();
			setOpenMenu(null);
			menuTrigger?.focus();
			return;
		}
		if (e.key === 'Tab') {
			setOpenMenu(null);
			return;
		}
		if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End')
			return;
		const el = e.currentTarget as HTMLElement;
		const items = [
			...el.querySelectorAll<HTMLElement>('[role^=menuitem]:not([aria-disabled=true])')
		];
		if (!items.length) return;
		e.preventDefault();
		const index = items.indexOf(document.activeElement as HTMLElement);
		const next =
			e.key === 'Home'
				? 0
				: e.key === 'End'
					? items.length - 1
					: e.key === 'ArrowDown'
						? (index + 1) % items.length
						: (index + items.length - 1) % items.length;
		items[next].focus();
	}
	function showMenu(name: 'settings' | 'account', trigger: HTMLButtonElement) {
		menuTrigger = trigger;
		const opening = openMenu() !== name;
		setOpenMenu(opening ? name : null);
		if (opening)
			queueMicrotask(() =>
				(name === 'settings' ? settingsMenu : accountMenu)
					?.querySelector<HTMLElement>('[role^=menuitem]')
					?.focus()
			);
	}
	createEffect(
		() => mobile(),
		(isOpen) => {
			if (!isOpen) return;
			const previous = document.body.style.overflow;
			document.body.style.overflow = 'hidden';
			queueMicrotask(() =>
				drawer?.querySelector<HTMLElement>('a[href],button:not([disabled])')?.focus()
			);
			return () => {
				document.body.style.overflow = previous;
			};
		}
	);

	function onOutside(event: MouseEvent) {
		const target = event.target as Node;
		if (
			!settingsMenu?.contains(target) &&
			!accountMenu?.contains(target) &&
			!(target instanceof HTMLElement && target.closest('[data-menu-trigger]'))
		)
			setOpenMenu(null);
	}
	createEffect(
		() => openMenu(),
		(name) => {
			if (name === null) return;
			document.addEventListener('pointerdown', onOutside);
			return () => document.removeEventListener('pointerdown', onOutside);
		}
	);
	createEffect(
		() => loc.pathname,
		() => {
			setMobile(false);
			setOpenMenu(null);
		}
	);
	onSettled(() => {
		setDark(document.documentElement.classList.contains('dark'));
		const mq = matchMedia('(min-width: 1024px)');
		const close = () => {
			if (mq.matches) setMobile(false);
		};
		mq.addEventListener('change', close);
		return () => mq.removeEventListener('change', close);
	});
	const menuItem =
		'flex w-full min-h-10 items-center gap-2 rounded-sm px-2 text-left text-sm outline-none hover:bg-accent focus:bg-accent focus-visible:ring-2 focus-visible:ring-ring';
	return (
		<>
			<a
				href="#main-content"
				class="sr-only fixed top-3 left-3 z-[100] rounded-md bg-foreground px-4 py-3 font-medium text-background focus:not-sr-only"
			>
				{m.skip_to_content()}
			</a>
			<header class="sticky top-0 z-50 border-b border-border bg-background">
				<div class="ace-shell flex h-16 items-center justify-between gap-4">
					<div class="flex min-w-0 items-center gap-3 md:gap-8">
						<button
							ref={(el) => {
								mobileTrigger = el;
							}}
							type="button"
							aria-label={m.nav_toggle_menu()}
							aria-haspopup="dialog"
							aria-expanded={mobile() ? 'true' : 'false'}
							aria-controls="ace-mobile-nav"
							onClick={() => setMobile(true)}
							class="inline-flex size-11 items-center justify-center rounded-md border border-border bg-card hover:bg-accent lg:hidden"
						>
							<Menu class="size-5" aria-hidden="true" />
						</button>
						<a
							href={href('/')}
							class="shrink-0 max-[359px]:w-10 max-[359px]:overflow-hidden"
						>
							<BrandLogo
								alt={m.site_brand_name()}
								class="h-10 w-auto max-w-none sm:h-11 md:h-12"
							/>
						</a>
						<nav
							class="hidden h-16 items-stretch lg:flex"
							aria-label={m.nav_toggle_menu()}
						>
							<For each={links}>
								{(link) => (
									<a
										href={href(link.href)}
										aria-current={active(link.href) ? 'page' : undefined}
										class={`relative flex items-center border-x border-transparent px-4 text-sm font-medium text-muted-foreground hover:text-foreground ${active(link.href) ? 'border-border bg-card text-foreground' : ''}`}
									>
										{link.label}
									</a>
								)}
							</For>
						</nav>
					</div>
					<div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
						<div class="relative hidden md:block">
							<button
								data-menu-trigger
								type="button"
								onClick={(e) => showMenu('settings', e.currentTarget)}
								onKeyDown={(e) => {
									if (e.key === 'ArrowDown' && !openMenu()) {
										e.preventDefault();
										showMenu('settings', e.currentTarget);
									}
								}}
								aria-expanded={openMenu() === 'settings' ? 'true' : 'false'}
								aria-haspopup="menu"
								aria-label={`${m.nav_language_label()} / ${m.nav_toggle_theme()}`}
								class="inline-flex h-10 w-12 items-center justify-center gap-1 rounded-md border border-border bg-card hover:bg-accent"
							>
								<Settings
									class="size-[18px]"
									stroke-width={1.75}
									aria-hidden="true"
								/>
								<ChevronDown class="size-3" aria-hidden="true" />
							</button>
							<Show when={openMenu() === 'settings'}>
								<div
									ref={(el) => {
										settingsMenu = el;
									}}
									role="menu"
									onKeyDown={menuKeys}
									class="absolute top-full right-0 z-50 mt-1 w-48 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-none outline-none"
								>
									<div class="px-2 py-1.5 text-xs text-muted-foreground">
										{m.nav_language_label()}
									</div>
									<For each={languages}>
										{(language) => (
											<button
												role="menuitemradio"
												type="button"
												aria-checked={
													activeLocale() === language.locale
														? 'true'
														: 'false'
												}
												class={menuItem}
												onClick={() => changeLanguage(language.locale)}
											>
												<span aria-hidden="true" class="w-3">
													{activeLocale() === language.locale ? '●' : ''}
												</span>
												{language.label}
											</button>
										)}
									</For>
									<div role="separator" class="my-1 h-px bg-border" />
									<button
										role="menuitem"
										type="button"
										class={menuItem}
										onClick={flipTheme}
									>
										<Show
											when={currentDark()}
											fallback={<Moon class="size-4" aria-hidden="true" />}
										>
											<Sun class="size-4" aria-hidden="true" />
										</Show>
										{currentDark() ? m.nav_light_mode() : m.nav_dark_mode()}
									</button>
								</div>
							</Show>
						</div>
						<a
							href={href('/get-pro')}
							aria-current={active('/get-pro') ? 'page' : undefined}
							class={`hidden min-h-10 items-center gap-1 rounded-md border px-3 text-sm font-semibold sm:inline-flex ${isPro() ? (active('/get-pro') ? 'border-foreground bg-foreground text-background' : 'border-border bg-card hover:bg-accent') : active('/get-pro') ? 'border-signal bg-signal/15 text-foreground' : 'border-signal bg-card text-foreground hover:bg-signal/10'}`}
						>
							{isPro() ? m.nav_pro_features() : m.account_get_pro()}
							<Show when={!isPro()}>
								<ArrowUpRight
									class="size-3.5 text-signal-deep"
									aria-hidden="true"
								/>
							</Show>
						</a>
						<Show
							when={user()}
							fallback={
								<>
									<a
										href={href('/signin')}
										class="hidden min-h-10 items-center px-2 text-sm font-medium sm:inline-flex"
									>
										{m.nav_log_in()}
									</a>
									<a
										href={href('/signup')}
										class="inline-flex min-h-10 items-center rounded-md bg-foreground px-3.5 text-sm font-medium text-background hover:opacity-90"
									>
										<span class="hidden sm:inline">{m.nav_sign_up()}</span>
										<span class="sm:hidden">{m.nav_join()}</span>
									</a>
								</>
							}
						>
							<Show when={user()?.role === 'admin'}>
								<a
									href={href('/admin/dashboard')}
									class="hidden min-h-10 items-center px-2 text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
								>
									{m.nav_admin_dashboard()}
								</a>
							</Show>
							<div class="relative">
								<button
									data-menu-trigger
									type="button"
									onClick={(e) => showMenu('account', e.currentTarget)}
									onKeyDown={(e) => {
										if (e.key === 'ArrowDown' && !openMenu()) {
											e.preventDefault();
											showMenu('account', e.currentTarget);
										}
									}}
									aria-expanded={openMenu() === 'account' ? 'true' : 'false'}
									aria-haspopup="menu"
									aria-label={m.account_settings()}
									class="inline-flex size-10 items-center justify-center rounded-md border border-foreground/25 bg-card font-mono text-xs font-medium hover:bg-accent"
								>
									{initial()}
								</button>
								<Show when={openMenu() === 'account'}>
									<div
										ref={(el) => {
											accountMenu = el;
										}}
										role="menu"
										onKeyDown={menuKeys}
										class="absolute top-full right-0 z-50 mt-1 w-60 rounded-md border border-border bg-popover p-1 shadow-none outline-none"
									>
										<div class="px-2 py-1.5">
											<span class="block truncate text-sm font-medium">
												{user()?.name ?? user()?.email}
											</span>
											<span class="block truncate text-xs text-muted-foreground">
												{user()?.email}
											</span>
										</div>
										<div role="separator" class="my-1 h-px bg-border" />
										<a
											role="menuitem"
											class={menuItem}
											href={href('/account')}
											onClick={() => setOpenMenu(null)}
										>
											<User class="mr-2 size-4" aria-hidden="true" />
											{m.account_settings()}
										</a>
										<button
											role="menuitem"
											type="button"
											class={`${menuItem} text-destructive focus:text-destructive`}
											onClick={signOut}
										>
											<LogOut class="mr-2 size-4" aria-hidden="true" />
											{m.sign_out()}
										</button>
									</div>
								</Show>
							</div>
						</Show>
					</div>
				</div>
			</header>
			<Show when={mobile()}>
				<div class="fixed inset-0 z-[60] lg:hidden">
					<button
						aria-label={m.close()}
						type="button"
						class="absolute inset-0 w-full bg-black/55"
						onClick={closeMobile}
					/>
					<aside
						ref={(el) => {
							drawer = el;
						}}
						id="ace-mobile-nav"
						role="dialog"
						aria-modal="true"
						aria-label={m.nav_toggle_menu()}
						onKeyDown={keyTrap}
						class="absolute inset-y-0 left-0 flex w-[min(92vw,24rem)] flex-col overflow-y-auto border-r border-border bg-background"
					>
						<div class="border-b border-border px-5 py-5 text-left">
							<div class="flex items-center justify-between">
								<BrandLogo alt={m.site_brand_name()} class="h-10 w-auto" />
								<button
									type="button"
									onClick={closeMobile}
									aria-label={m.close()}
									class="min-h-10 rounded-md border border-border px-3"
								>
									×
								</button>
							</div>
							<p class="mt-2 max-w-xs text-sm text-muted-foreground">
								{m.nav_menu_description()}
							</p>
						</div>
						<nav class="flex flex-1 flex-col" aria-label={m.nav_toggle_menu()}>
							<For each={links}>
								{(link) => {
									const Icon = link.icon;
									return (
										<a
											href={href(link.href)}
											onClick={() => setMobile(false)}
											class={`flex min-h-14 items-center gap-3 border-b border-border px-5 text-base font-medium ${active(link.href) ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
										>
											<Icon class="size-4" aria-hidden="true" />
											{link.label}
										</a>
									);
								}}
							</For>
							<a
								href={href('/get-pro')}
								onClick={() => setMobile(false)}
								class={`flex min-h-14 items-center gap-3 border-b border-border px-5 text-base font-medium ${active('/get-pro') ? 'bg-accent text-foreground' : 'text-muted-foreground'}`}
							>
								<Gauge class="size-4" aria-hidden="true" />
								{isPro() ? m.nav_pro_features() : m.account_get_pro()}
							</a>
							<div class="mt-auto border-t border-border">
								<LanguageSelector mobile />
								<Show
									when={user()}
									fallback={
										<>
											<a
												href={href('/signin')}
												onClick={() => setMobile(false)}
												class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
											>
												<LogIn class="size-4" aria-hidden="true" />
												{m.nav_log_in()}
											</a>
											<a
												href={href('/signup')}
												onClick={() => setMobile(false)}
												class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
											>
												<UserPlus class="size-4" aria-hidden="true" />
												{m.nav_sign_up()}
											</a>
										</>
									}
								>
									<a
										href={href('/account')}
										onClick={() => setMobile(false)}
										class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
									>
										<User class="size-4" aria-hidden="true" />
										{m.account_settings()}
									</a>
									<Show when={user()?.role === 'admin'}>
										<a
											href={href('/admin/dashboard')}
											onClick={() => setMobile(false)}
											class="flex min-h-14 items-center gap-3 border-b border-border px-5 font-medium"
										>
											<LayoutDashboard class="size-4" aria-hidden="true" />
											{m.nav_admin_dashboard()}
										</a>
									</Show>
									<button
										type="button"
										onClick={signOut}
										class="flex min-h-14 w-full items-center gap-3 border-b border-border px-5 text-left font-medium text-destructive hover:bg-destructive/10"
									>
										<LogOut class="size-4" aria-hidden="true" />
										{m.sign_out()}
									</button>
								</Show>
								<button
									type="button"
									onClick={flipTheme}
									class="flex min-h-14 w-full items-center gap-3 px-5 text-left font-medium"
								>
									<Show
										when={currentDark()}
										fallback={<Moon class="size-4" aria-hidden="true" />}
									>
										<Sun class="size-4" aria-hidden="true" />
									</Show>
									{currentDark() ? m.nav_light_mode() : m.nav_dark_mode()}
								</button>
							</div>
						</nav>
					</aside>
				</div>
			</Show>
		</>
	);
}
