import { createEffect, createMemo, createSignal, For, onCleanup, Show, refresh } from 'solid-js';
import { Title } from '@solidjs/meta';
import {
	ArrowLeft,
	User,
	Gauge,
	Shield,
	Trash2,
	Download,
	Loader2,
	KeyRound,
	Smartphone,
	X,
	Check,
	RefreshCw,
	CalendarDays
} from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime';
import { getAccountData } from './data';
import ChangePasswordDialog from './_components/ChangePasswordDialog';
import CancelSubscriptionDialog from './_components/CancelSubscriptionDialog';
import Enable2FADialog from './_components/Enable2FADialog';
import Disable2FADialog from './_components/Disable2FADialog';
import DeleteAccountDialog from './_components/DeleteAccountDialog';
import type { Notify } from './_components/DialogShell';

export const route = { preload: () => void getAccountData() };
type SessionEntry = Awaited<ReturnType<typeof getAccountData>>['sessions'][number];

const card = 'rounded-lg border border-border bg-card text-card-foreground shadow-sm';
const title = 'flex items-center gap-2 font-display text-xl font-semibold';
const muted = 'text-sm text-muted-foreground';
const outlinedButton =
	'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50';
const ghostButton =
	'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50';

function parseUserAgent(ua: string | null): string {
	if (!ua) return m.account_unknown_device();
	if (ua.includes('Chrome')) {
		const os = ua.includes('Windows')
			? 'Windows'
			: ua.includes('Mac')
				? 'macOS'
				: ua.includes('Linux')
					? 'Linux'
					: '';
		return os
			? m.account_browser_on_os({ browser: m.account_browser_chrome(), os })
			: m.account_browser_chrome();
	}
	if (ua.includes('Firefox')) return m.account_browser_firefox();
	if (ua.includes('Safari') && !ua.includes('Chrome')) return m.account_browser_safari();
	return ua.split(' ')[0] || m.account_unknown_device();
}
function formatDate(value: string | null) {
	if (!value) return '';
	return new Date(value).toLocaleDateString(getLocale(), {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export default function AccountPage() {
	const data = createMemo(() => getAccountData());
	const [sessions, setSessions] = createSignal<SessionEntry[]>([]);
	createEffect(
		() => data().sessions,
		(sessions) => {
			setSessions(sessions);
		}
	);
	const [show2faEnableDialog, setShow2faEnableDialog] = createSignal(false);
	const [show2faDisableDialog, setShow2faDisableDialog] = createSignal(false);
	const [showPasswordDialog, setShowPasswordDialog] = createSignal(false);
	const [showCancelDialog, setShowCancelDialog] = createSignal(false);
	const [showDeleteDialog, setShowDeleteDialog] = createSignal(false);
	const [syncLoading, setSyncLoading] = createSignal(false);
	const [syncCooldown, setSyncCooldown] = createSignal(0);
	const [syncResult, setSyncResult] = createSignal<'success' | 'failure' | null>(null);
	const [revokingSessionId, setRevokingSessionId] = createSignal<string | null>(null);
	const [sessionRevokeError, setSessionRevokeError] = createSignal<string | null>(null);
	const [notice, setNotice] = createSignal<{
		message: string;
		kind: 'success' | 'error' | 'info';
	} | null>(null);
	let syncTimer: ReturnType<typeof setInterval> | undefined;
	let noticeTimer: ReturnType<typeof setTimeout> | undefined;
	onCleanup(() => {
		if (syncTimer) clearInterval(syncTimer);
		if (noticeTimer) clearTimeout(noticeTimer);
	});

	const notify: Notify = (message, kind = 'info') => {
		setNotice({ message, kind });
		if (noticeTimer) clearTimeout(noticeTimer);
		noticeTimer = setTimeout(() => setNotice(null), 5000);
	};
	function startSyncCooldown() {
		setSyncCooldown(30);
		if (syncTimer) clearInterval(syncTimer);
		syncTimer = setInterval(() => {
			setSyncCooldown((n) => {
				if (n <= 1) {
					clearInterval(syncTimer);
					syncTimer = undefined;
					return 0;
				}
				return n - 1;
			});
		}, 1000);
	}
	const refreshAccount = () => {
		void refresh(data).catch(() => notify(m.account_sync_failure(), 'error'));
	};

	async function handleSyncSubscription() {
		if (syncLoading() || syncCooldown() > 0) return;
		setSyncLoading(true);
		setSyncResult(null);
		try {
			const response = await fetch('/api/v1/account/sync-subscription', {
				method: 'POST',
				credentials: 'include'
			});
			if (!response.ok) throw new Error('Sync failed');
			const result: {
				success: boolean;
				changed: boolean;
				isPro: boolean;
				expiration: string | null;
			} = await response.json();
			if (!result.success) throw new Error('Sync failed');
			setSyncResult('success');
			notify(
				result.changed
					? result.isPro
						? m.account_sync_pro_activated()
						: m.account_sync_pro_expired()
					: m.account_sync_success_unchanged(),
				'success'
			);
			await refresh(data);
		} catch {
			setSyncResult('failure');
			notify(m.account_sync_failure(), 'error');
		} finally {
			setSyncLoading(false);
			startSyncCooldown();
		}
	}
	async function handleRevokeSession(id: string) {
		if (revokingSessionId() || sessions().find((s) => s.id === id)?.isCurrent) return;
		setRevokingSessionId(id);
		setSessionRevokeError(null);
		try {
			const response = await fetch('/api/v1/account/revoke-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId: id }),
				credentials: 'include'
			});
			if (!response.ok) throw new Error('Session revoke failed');
			setSessions((list) => list.filter((s) => s.id !== id));
			notify(m.account_session_revoked(), 'success');
		} catch {
			setSessionRevokeError(m.account_session_revoke_error());
		} finally {
			setRevokingSessionId(null);
		}
	}
	async function handleExportData() {
		try {
			const response = await fetch('/api/v1/account/export', { credentials: 'include' });
			if (!response.ok) throw new Error('Export failed');
			const url = URL.createObjectURL(await response.blob());
			try {
				const anchor = document.createElement('a');
				anchor.href = url;
				anchor.download = 'ace-blocker-data.json';
				document.body.appendChild(anchor);
				anchor.click();
				anchor.remove();
			} finally {
				URL.revokeObjectURL(url);
			}
			notify(m.account_export_success_title(), 'success');
		} catch {
			notify(m.account_export_error(), 'error');
		}
	}
	return (
		<>
			<Title>{m.page_title_account()}</Title>
			<main class="min-h-screen bg-background">
				<div class="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
					<a
						href="/"
						class={ghostButton + ' mb-6 text-muted-foreground hover:text-foreground'}
					>
						<ArrowLeft class="size-4" aria-hidden="true" />
						{m.account_back_home()}
					</a>
					<header class="mb-8 max-w-2xl">
						<h1 class="font-display text-4xl font-semibold">{m.account_title()}</h1>
						<p class="mt-2 text-muted-foreground">{m.account_description()}</p>
					</header>
					<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
						<div class="flex min-w-0 flex-col gap-6">
							<section class={card}>
								<div class="space-y-1.5 p-6">
									<h2 class={title}>
										<User class="size-5" aria-hidden="true" />
										{m.account_identity_title()}
									</h2>
									<p class={muted}>{m.account_identity_description()}</p>
								</div>
								<div class="px-6 pb-6">
									<dl class="grid gap-5 sm:grid-cols-2">
										<div>
											<dt class="text-xs font-medium text-muted-foreground">
												{m.account_name_label()}
											</dt>
											<dd class="mt-1 text-sm font-medium break-words">
												{data().user.name}
											</dd>
										</div>
										<div>
											<dt class="text-xs font-medium text-muted-foreground">
												{m.account_email_label()}
											</dt>
											<dd class="mt-1 text-sm font-medium break-all">
												{data().user.email}
											</dd>
										</div>
										<div>
											<dt class="text-xs font-medium text-muted-foreground">
												{m.account_member_since()}
											</dt>
											<dd class="mt-1 text-sm font-medium">
												{formatDate(data().user.createdAt)}
											</dd>
										</div>
									</dl>
								</div>
							</section>

							<section class={card}>
								<div class="space-y-1.5 p-6">
									<h2 class={title}>
										<Shield class="size-5" aria-hidden="true" />
										{m.account_security_title()}
									</h2>
									<p class={muted}>{m.account_security_description()}</p>
								</div>
								<div class="flex flex-col gap-5 px-6 pb-6">
									<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p class="font-medium">
												{m.account_change_password_title()}
											</p>
											<p class={muted}>{m.account_password_description()}</p>
										</div>
										<button
											class={outlinedButton}
											type="button"
											onClick={() => setShowPasswordDialog(true)}
										>
											<KeyRound class="size-4" aria-hidden="true" />
											{m.account_change_password_button()}
										</button>
									</div>
									<div class="h-px w-full bg-border" />
									<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p class="font-medium">
												{m.account_two_factor_title()}
											</p>
											<p class={muted}>{m.account_2fa_description()}</p>
										</div>
										<div class="flex items-center gap-2">
											<Show when={data().user.twoFactorEnabled}>
												<span class="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-xs font-semibold">
													<Check class="size-3" aria-hidden="true" />
													{m.account_enabled()}
												</span>
											</Show>
											<button
												type="button"
												class={outlinedButton}
												onClick={() =>
													data().user.twoFactorEnabled
														? setShow2faDisableDialog(true)
														: setShow2faEnableDialog(true)
												}
											>
												{data().user.twoFactorEnabled
													? m.account_disable_2fa()
													: m.account_enable_2fa()}
											</button>
										</div>
									</div>
								</div>
							</section>

							<section class={card}>
								<div class="space-y-1.5 p-6">
									<h2 class={title}>
										<Smartphone class="size-5" aria-hidden="true" />
										{m.account_sessions_title()}
									</h2>
									<p class={muted}>{m.account_sessions_description()}</p>
								</div>
								<div class="flex flex-col gap-3 px-6 pb-6">
									<Show when={sessionRevokeError()}>
										<p role="alert" class="text-sm text-destructive">
											{sessionRevokeError()}
										</p>
									</Show>
									<For each={sessions()}>
										{(session) => (
											<div class="flex min-w-0 flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
												<div class="min-w-0">
													<p class="flex flex-wrap items-center gap-2 text-sm font-medium">
														{parseUserAgent(session.userAgent)}
														<Show when={session.isCurrent}>
															<span class="inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold">
																{m.account_current_session()}
															</span>
														</Show>
													</p>
													<p class="mt-1 text-xs break-words text-muted-foreground">
														{session.ipAddress ??
															m.account_unknown_ip()}{' '}
														· {formatDate(session.createdAt)}
													</p>
												</div>
												<button
													type="button"
													class={ghostButton}
													disabled={
														session.isCurrent ||
														revokingSessionId() === session.id
													}
													aria-describedby={
														session.isCurrent
															? 'current-session-' + session.id
															: undefined
													}
													onClick={() =>
														void handleRevokeSession(session.id)
													}
												>
													<Show
														when={revokingSessionId() === session.id}
														fallback={
															<>
																<X
																	class="size-4"
																	aria-hidden="true"
																/>
																{m.account_revoke_session()}
															</>
														}
													>
														<Loader2
															class="size-4 animate-spin"
															aria-hidden="true"
														/>
													</Show>
												</button>
												<Show when={session.isCurrent}>
													<span
														id={'current-session-' + session.id}
														class="sr-only"
													>
														{m.account_current_session_cannot_revoke()}
													</span>
												</Show>
											</div>
										)}
									</For>
								</div>
							</section>

							<section class={card}>
								<div class="space-y-1.5 p-6">
									<h2 class={title}>{m.account_data_title()}</h2>
									<p class={muted}>{m.account_data_description()}</p>
								</div>
								<div class="px-6 pb-6">
									<div class="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
										<div>
											<p class="font-medium">{m.account_export_data()}</p>
											<p class={muted}>
												{m.account_export_data_description()}
											</p>
										</div>
										<button
											type="button"
											class={outlinedButton}
											onClick={() => void handleExportData()}
										>
											<Download class="size-4" aria-hidden="true" />
											{m.account_export_button()}
										</button>
									</div>
								</div>
							</section>

							<section class={card + ' border-destructive/40'}>
								<div class="space-y-1.5 p-6">
									<h2 class={title + ' text-destructive'}>
										{m.account_danger_zone_title()}
									</h2>
									<p class={muted}>{m.account_danger_zone_description()}</p>
								</div>
								<div class="flex flex-col gap-4 px-6 pb-6">
									<Show
										when={data().user.role === 'admin'}
										fallback={
											<div class="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between">
												<div>
													<p class="font-medium text-destructive">
														{m.account_delete_account()}
													</p>
													<p class={muted}>
														{m.account_delete_short_description()}
													</p>
												</div>
												<button
													type="button"
													onClick={() => setShowDeleteDialog(true)}
													class="text-destructive-foreground inline-flex min-h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium"
												>
													<Trash2 class="size-4" aria-hidden="true" />
													{m.account_delete_account()}
												</button>
											</div>
										}
									>
										<div class="flex items-start gap-3 rounded-lg border border-border p-4">
											<Shield
												class="mt-0.5 size-5 text-muted-foreground"
												aria-hidden="true"
											/>
											<div>
												<p class="font-medium">
													{m.account_admin_protected_title()}
												</p>
												<p class={muted}>
													{m.account_admin_protected_description()}
												</p>
											</div>
										</div>
									</Show>
								</div>
							</section>
						</div>

						<aside class="lg:sticky lg:top-24">
							<section class={card}>
								<div class="space-y-2 p-6">
									<div class="flex items-center justify-between gap-3">
										<Gauge
											class="size-5 text-muted-foreground"
											aria-hidden="true"
										/>
										<span
											class={
												data().isPro
													? 'inline-flex rounded-md bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground'
													: 'inline-flex rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold'
											}
										>
											{data().isPro
												? m.account_plan_pro()
												: m.account_plan_free()}
										</span>
									</div>
									<h2 class={title}>{m.account_subscription_title()}</h2>
									<p class={muted}>
										{data().isPro
											? m.account_pro_plan_description()
											: m.account_free_plan_description()}
									</p>
								</div>
								<div class="flex flex-col gap-4 px-6 pb-6">
									<Show when={data().isPro && data().proExpiration}>
										<div class="flex items-start gap-2 text-sm">
											<CalendarDays
												class="mt-0.5 size-4 text-muted-foreground"
												aria-hidden="true"
											/>
											<span>
												{data().isCancelled
													? m.account_pro_cancels({
															date: formatDate(data().proExpiration)
														})
													: m.account_pro_expires({
															date: formatDate(data().proExpiration)
														})}
											</span>
										</div>
									</Show>
									<Show
										when={data().isPro && !data().isCancelled}
										fallback={
											<Show when={!data().isPro}>
												<a
													href="/get-pro"
													class="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
												>
													<Gauge class="size-4" aria-hidden="true" />
													{m.account_get_pro()}
												</a>
											</Show>
										}
									>
										<button
											type="button"
											class={outlinedButton + ' w-full text-destructive'}
											onClick={() => setShowCancelDialog(true)}
										>
											{m.account_cancel_subscription()}
										</button>
									</Show>
									<div class="h-px w-full bg-border" />
									<div class="flex flex-col gap-2">
										<p
											class={
												muted +
												(syncResult() === 'failure'
													? ' text-destructive'
													: '')
											}
											role={syncResult() === 'failure' ? 'alert' : 'status'}
											aria-live="polite"
										>
											{syncResult() === 'success'
												? syncCooldown() > 0
													? m.account_sync_cooldown({
															seconds: syncCooldown()
														})
													: m.account_sync_success()
												: syncResult() === 'failure'
													? m.account_sync_failure()
													: m.account_sync_description()}
										</p>
										<button
											type="button"
											class={outlinedButton}
											disabled={syncLoading() || syncCooldown() > 0}
											onClick={() => void handleSyncSubscription()}
										>
											<Show
												when={syncLoading()}
												fallback={
													<RefreshCw class="size-4" aria-hidden="true" />
												}
											>
												<Loader2
													class="size-4 animate-spin"
													aria-hidden="true"
												/>
											</Show>
											{syncLoading()
												? m.account_sync_syncing()
												: syncCooldown() > 0
													? syncCooldown() + 's'
													: m.account_sync_subscription()}
										</button>
									</div>
								</div>
							</section>
						</aside>
					</div>

					<ChangePasswordDialog
						open={showPasswordDialog()}
						onOpenChange={setShowPasswordDialog}
						notify={notify}
					/>
					<CancelSubscriptionDialog
						open={showCancelDialog()}
						onOpenChange={setShowCancelDialog}
						notify={notify}
						onChanged={refreshAccount}
					/>
					<Enable2FADialog
						open={show2faEnableDialog()}
						onOpenChange={setShow2faEnableDialog}
						notify={notify}
						onChanged={refreshAccount}
					/>
					<Disable2FADialog
						open={show2faDisableDialog()}
						onOpenChange={setShow2faDisableDialog}
						notify={notify}
						onChanged={refreshAccount}
					/>
					<Show when={data().user.role !== 'admin'}>
						<DeleteAccountDialog
							open={showDeleteDialog()}
							onOpenChange={setShowDeleteDialog}
							email={data().user.email}
						/>
					</Show>
				</div>
			</main>
			<Show when={notice()}>
				<div
					class="fixed right-4 bottom-4 z-50 max-w-sm min-w-64 rounded-lg border border-border bg-background p-4 shadow-lg"
					role={notice()?.kind === 'error' ? 'alert' : 'status'}
					aria-live={notice()?.kind === 'error' ? 'assertive' : 'polite'}
				>
					<p
						class={
							notice()?.kind === 'error'
								? 'text-sm font-medium text-destructive'
								: 'text-sm font-medium'
						}
					>
						{notice()?.message}
					</p>
					<button
						type="button"
						class="mt-2 text-xs text-muted-foreground underline"
						onClick={() => setNotice(null)}
					>
						{m.account_cancel_action()}
					</button>
				</div>
			</Show>
		</>
	);
}
