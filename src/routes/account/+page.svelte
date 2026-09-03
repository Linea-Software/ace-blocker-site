<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import {
		ArrowLeft,
		User,
		Crown,
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
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast, Toaster } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';
	import ChangePasswordDialog from './_components/ChangePasswordDialog.svelte';
	import CancelSubscriptionDialog from './_components/CancelSubscriptionDialog.svelte';
	import Disable2FADialog from './_components/Disable2FADialog.svelte';
	import DeleteAccountDialog from './_components/DeleteAccountDialog.svelte';
	import { onDestroy } from 'svelte';

	let { data } = $props();

	// ── Two-factor state ─────────────────────────────────────────────────────
	let twoFactorLoading = $state(false);
	let show2faDisableDialog = $state(false);

	// ── Dialog visibility (each dialog owns its own form state) ──────────────
	let showPasswordDialog = $state(false);
	let showCancelDialog = $state(false);
	let showDeleteDialog = $state(false);

	// ── Subscription sync state ──────────────────────────────────────────────
	let syncLoading = $state(false);
	let syncCooldown = $state(0);
	let syncTimer: ReturnType<typeof setInterval> | null = $state(null);
	let syncResult = $state<'success' | 'failure' | null>(null);

	// ── Session revoke state ─────────────────────────────────────────────────
	let revokingSessionId = $state<string | null>(null);
	let localSessions = $derived([...data.sessions]);
	let sessionRevokeError = $state<string | null>(null);

	// ── Derived ──────────────────────────────────────────────────────────────
	const user = $derived(data.user);
	const isPro = $derived(data.isPro);
	const proExpiration = $derived(data.proExpiration);
	const isCancelled = $derived(data.isCancelled);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function parseUserAgent(ua: string | null): string {
		if (!ua) return m.account_unknown_device();
		try {
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
			if (ua.includes('Firefox')) {
				return m.account_browser_firefox();
			}
			if (ua.includes('Safari') && !ua.includes('Chrome')) {
				return m.account_browser_safari();
			}
			return ua.split(' ')[0] ?? 'Unknown';
		} catch {
			return m.account_unknown_device();
		}
	}

	function formatDate(iso: string | Date | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	}

	// ── Actions ──────────────────────────────────────────────────────────────

	async function handleSyncSubscription() {
		if (syncLoading || syncCooldown > 0) return;

		syncLoading = true;
		syncResult = null;
		try {
			const res = await fetch('/api/v1/account/sync-subscription', {
				method: 'POST',
				credentials: 'include'
			});

			if (!res.ok) {
				const body = await res.text();
				throw new Error(body || 'Sync failed');
			}

			const result: {
				success: boolean;
				changed: boolean;
				isPro: boolean;
				expiration: string | null;
			} = await res.json();

			syncResult = 'success';

			if (result.changed) {
				if (result.isPro) {
					toast.success(m.account_sync_pro_activated());
				} else {
					toast.success(m.account_sync_pro_expired());
				}
			} else {
				toast.success(m.account_sync_success_unchanged());
			}

			// Refresh server data to reflect updated pro status reactively
			await invalidateAll();
		} catch (err: any) {
			syncResult = 'failure';
			toast.error(m.account_sync_failure());
		} finally {
			syncLoading = false;
			startSyncCooldown();
		}
	}

	function startSyncCooldown() {
		syncCooldown = 30;
		if (syncTimer) clearInterval(syncTimer);
		syncTimer = setInterval(() => {
			syncCooldown -= 1;
			if (syncCooldown <= 0) {
				if (syncTimer) clearInterval(syncTimer);
				syncTimer = null;
			}
		}, 1000);
	}

	onDestroy(() => {
		if (syncTimer) clearInterval(syncTimer);
	});

	async function handleEnable2FA() {
		twoFactorLoading = true;
		try {
			// @ts-expect-error - twoFactor client type might not match runtime
			await authClient.twoFactor.enable();
			toast.info(m.account_2fa_check_email());
		} catch (err: any) {
			toast.error(err.message || m.account_2fa_enable_error());
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleRevokeSession(sessionId: string) {
		revokingSessionId = sessionId;
		sessionRevokeError = null;
		try {
			const res = await fetch('/api/v1/account/revoke-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ sessionId }),
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Failed to revoke');

			localSessions = localSessions.filter((s) => s.id !== sessionId);
			toast.success(m.account_session_revoked());
		} catch (err: any) {
			sessionRevokeError = m.account_session_revoke_error();
		} finally {
			revokingSessionId = null;
		}
	}

	async function handleExportData() {
		try {
			const res = await fetch('/api/v1/account/export', {
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Export failed');

			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'ace-blocker-data.json';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toast.success(m.account_export_success_title(), {
				description: m.account_export_description()
			});
		} catch (err: any) {
			toast.error(m.account_export_error());
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_account()}</title>
</svelte:head>

<main class="min-h-screen bg-background">
	<div class="container mx-auto max-w-5xl px-4 py-8 sm:py-12">
		<Button
			variant="ghost"
			href={resolve('/')}
			class="mb-6 text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft data-icon="inline-start" aria-hidden="true" />
			{m.account_back_home()}
		</Button>

		<header class="mb-8 max-w-2xl">
			<h1 class="text-3xl font-bold tracking-tight">{m.account_title()}</h1>
			<p class="mt-2 text-muted-foreground">{m.account_description()}</p>
		</header>

		<div class="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
			<div class="flex min-w-0 flex-col gap-6">
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2"
							><User aria-hidden="true" />{m.account_identity_title()}</Card.Title
						>
						<Card.Description>{m.account_identity_description()}</Card.Description>
					</Card.Header>
					<Card.Content>
						<dl class="grid gap-5 sm:grid-cols-2">
							<div>
								<dt class="text-xs font-medium text-muted-foreground">
									{m.account_name_label()}
								</dt>
								<dd class="mt-1 text-sm font-medium break-words">{user.name}</dd>
							</div>
							<div>
								<dt class="text-xs font-medium text-muted-foreground">
									{m.account_email_label()}
								</dt>
								<dd class="mt-1 text-sm font-medium break-all">{user.email}</dd>
							</div>
							<div>
								<dt class="text-xs font-medium text-muted-foreground">
									{m.account_member_since()}
								</dt>
								<dd class="mt-1 text-sm font-medium">
									{formatDate(user.createdAt)}
								</dd>
							</div>
						</dl>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center gap-2"
							><Shield aria-hidden="true" />{m.account_security_title()}</Card.Title
						>
						<Card.Description>{m.account_security_description()}</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-5">
						<div
							class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p class="font-medium">{m.account_change_password_title()}</p>
								<p class="text-sm text-muted-foreground">
									{m.account_password_description()}
								</p>
							</div>
							<Button variant="outline" onclick={() => (showPasswordDialog = true)}
								><KeyRound
									data-icon="inline-start"
									aria-hidden="true"
								/>{m.account_change_password_button()}</Button
							>
						</div>
						<Separator />
						<div
							class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p class="font-medium">{m.account_two_factor_title()}</p>
								<p class="text-sm text-muted-foreground">
									{m.account_2fa_description()}
								</p>
							</div>
							<div class="flex items-center gap-2">
								{#if user.twoFactorEnabled}<Badge variant="outline"
										><Check aria-hidden="true" />{m.account_enabled()}</Badge
									>{/if}
								<Button
									variant="outline"
									size="sm"
									disabled={twoFactorLoading}
									onclick={() =>
										user.twoFactorEnabled
											? (show2faDisableDialog = true)
											: handleEnable2FA()}
								>
									{#if twoFactorLoading}<Loader2
											class="animate-spin"
											aria-hidden="true"
										/>{/if}
									{user.twoFactorEnabled
										? m.account_disable_2fa()
										: m.account_enable_2fa()}
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<Card.Root>
					<Card.Header
						><Card.Title class="flex items-center gap-2"
							><Smartphone
								aria-hidden="true"
							/>{m.account_sessions_title()}</Card.Title
						><Card.Description>{m.account_sessions_description()}</Card.Description
						></Card.Header
					>
					<Card.Content class="flex flex-col gap-3">
						{#if sessionRevokeError}<p class="text-sm text-destructive" role="alert">
								{sessionRevokeError}
							</p>{/if}
						{#each localSessions as session (session.id)}
							<div
								class="flex min-w-0 flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div class="min-w-0">
									<p
										class="flex flex-wrap items-center gap-2 text-sm font-medium"
									>
										{parseUserAgent(
											session.userAgent
										)}{#if session.isCurrent}<Badge variant="secondary"
												>{m.account_current_session()}</Badge
											>{/if}
									</p>
									<p class="mt-1 text-xs break-words text-muted-foreground">
										{session.ipAddress ?? m.account_unknown_ip()} · {formatDate(
											session.createdAt
										)}
									</p>
								</div>
								<Button
									variant="ghost"
									size="sm"
									disabled={session.isCurrent || revokingSessionId === session.id}
									aria-describedby={session.isCurrent
										? `current-session-${session.id}`
										: undefined}
									onclick={() => handleRevokeSession(session.id)}
								>
									{#if revokingSessionId === session.id}<Loader2
											class="animate-spin"
											aria-hidden="true"
										/>{:else}<X
											data-icon="inline-start"
											aria-hidden="true"
										/>{m.account_revoke_session()}{/if}
								</Button>
								{#if session.isCurrent}<span
										id={`current-session-${session.id}`}
										class="sr-only"
										>{m.account_current_session_cannot_revoke()}</span
									>{/if}
							</div>
						{/each}
					</Card.Content>
				</Card.Root>

				<Card.Root class="border-destructive/40">
					<Card.Header
						><Card.Title class="text-destructive"
							>{m.account_danger_zone_title()}</Card.Title
						><Card.Description>{m.account_danger_zone_description()}</Card.Description
						></Card.Header
					>
					<Card.Content class="flex flex-col gap-4">
						<div
							class="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p class="font-medium">{m.account_export_data()}</p>
								<p class="text-sm text-muted-foreground">
									{m.account_export_data_description()}
								</p>
							</div>
							<Button variant="outline" size="sm" onclick={handleExportData}
								><Download
									data-icon="inline-start"
									aria-hidden="true"
								/>{m.account_export_button()}</Button
							>
						</div>
						<div
							class="flex flex-col gap-3 rounded-lg border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p class="font-medium text-destructive">
									{m.account_delete_account()}
								</p>
								<p class="text-sm text-muted-foreground">
									{m.account_delete_short_description()}
								</p>
							</div>
							<Button
								variant="destructive"
								size="sm"
								onclick={() => (showDeleteDialog = true)}
								><Trash2
									data-icon="inline-start"
									aria-hidden="true"
								/>{m.account_delete_account()}</Button
							>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<aside class="lg:sticky lg:top-24">
				<Card.Root class="border-brand/30">
					<Card.Header
						><div class="flex items-center justify-between gap-3">
							<Crown class="text-brand" aria-hidden="true" /><Badge
								variant={isPro ? 'default' : 'secondary'}
								>{isPro ? m.account_plan_pro() : m.account_plan_free()}</Badge
							>
						</div>
						<Card.Title>{m.account_subscription_title()}</Card.Title><Card.Description
							>{isPro
								? m.account_pro_plan_description()
								: m.account_free_plan_description()}</Card.Description
						></Card.Header
					>
					<Card.Content class="flex flex-col gap-4">
						{#if isPro && proExpiration}<div class="flex items-start gap-2 text-sm">
								<CalendarDays
									class="mt-0.5 text-muted-foreground"
									aria-hidden="true"
								/><span
									>{isCancelled
										? m.account_pro_cancels({ date: formatDate(proExpiration) })
										: m.account_pro_expires({
												date: formatDate(proExpiration)
											})}</span
								>
							</div>{/if}
						{#if isPro && !isCancelled}<Button
								variant="outline"
								class="w-full text-destructive"
								onclick={() => (showCancelDialog = true)}
								>{m.account_cancel_subscription()}</Button
							>{:else if !isPro}<Button
								href={resolve('/get-pro')}
								class="w-full bg-brand text-amber-950 hover:bg-amber-600"
								><Crown
									data-icon="inline-start"
									aria-hidden="true"
								/>{m.account_get_pro()}</Button
							>{/if}
						<Separator />
						<div class="flex flex-col gap-2">
							<p
								class="text-sm text-muted-foreground"
								class:text-destructive={syncResult === 'failure'}
								role={syncResult === 'failure' ? 'alert' : 'status'}
								aria-live="polite"
							>
								{#if syncResult === 'success'}{syncCooldown > 0
										? m.account_sync_cooldown({ seconds: syncCooldown })
										: m.account_sync_success()}{:else if syncResult === 'failure'}{m.account_sync_failure()}{:else}{m.account_sync_description()}{/if}
							</p>
							<Button
								variant="outline"
								size="sm"
								disabled={syncLoading || syncCooldown > 0}
								onclick={handleSyncSubscription}
								>{#if syncLoading}<Loader2
										class="animate-spin"
										aria-hidden="true"
									/>{m.account_sync_syncing()}{:else}<RefreshCw
										data-icon="inline-start"
										aria-hidden="true"
									/>{syncCooldown > 0
										? `${syncCooldown}s`
										: m.account_sync_subscription()}{/if}</Button
							>
						</div>
					</Card.Content>
				</Card.Root>
			</aside>
		</div>

		<ChangePasswordDialog bind:open={showPasswordDialog} />
		<CancelSubscriptionDialog bind:open={showCancelDialog} />
		<Disable2FADialog bind:open={show2faDisableDialog} />
		<DeleteAccountDialog bind:open={showDeleteDialog} email={user.email} />
	</div>
</main>

<Toaster position="bottom-right" />
