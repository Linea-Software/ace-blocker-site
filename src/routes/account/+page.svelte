<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import * as Tabs from '$lib/components/ui/tabs';
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
		RefreshCw
	} from '@lucide/svelte';
	import { authClient } from '$lib/auth-client';
	import { invalidateAll } from '$app/navigation';
	import { toast, Toaster } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';
	import ChangePasswordDialog from './_components/ChangePasswordDialog.svelte';
	import CancelSubscriptionDialog from './_components/CancelSubscriptionDialog.svelte';
	import Disable2FADialog from './_components/Disable2FADialog.svelte';
	import DeleteAccountDialog from './_components/DeleteAccountDialog.svelte';

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
	let localSessions = $state<typeof data.sessions>([]);
	let sessionRevokeError = $state<string | null>(null);

	$effect(() => {
		localSessions = [...data.sessions];
	});

	// ── Derived ──────────────────────────────────────────────────────────────
	const user = $derived(data.user);
	const isPro = $derived(data.isPro);
	const proExpiration = $derived(data.proExpiration);
	const isCancelled = $derived(data.isCancelled);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function parseUserAgent(ua: string | null): string {
		if (!ua) return 'Unknown';
		try {
			if (ua.includes('Chrome')) {
				const os = ua.includes('Windows')
					? 'Windows'
					: ua.includes('Mac')
						? 'macOS'
						: ua.includes('Linux')
							? 'Linux'
							: '';
				return os ? `Chrome on ${os}` : 'Chrome';
			}
			if (ua.includes('Firefox')) {
				return 'Firefox';
			}
			if (ua.includes('Safari') && !ua.includes('Chrome')) {
				return 'Safari';
			}
			return ua.split(' ')[0] ?? 'Unknown';
		} catch {
			return 'Unknown';
		}
	}

	function formatDate(iso: string | null): string {
		if (!iso) return '';
		return new Date(iso).toLocaleDateString('en-US', {
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

	async function handleEnable2FA() {
		twoFactorLoading = true;
		try {
			// @ts-expect-error - twoFactor client type might not match runtime
			await authClient.twoFactor.enable();
			toast.info('Check your email for the verification code to complete 2FA setup.');
		} catch (err: any) {
			toast.error(err.message || 'Failed to enable 2FA');
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
			toast.error(err.message || 'Export failed');
		}
	}
</script>

<svelte:head>
	<title>{m.page_title_account()}</title>
</svelte:head>

<div class="min-h-screen bg-background">
	<div class="container mx-auto max-w-3xl px-4 py-12">
		<!-- Back to home -->
		<Button
			variant="ghost"
			href="/"
			class="mb-6 text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white"
		>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Back to home
		</Button>

		<!-- Header -->
		<div class="mb-10">
			<h1 class="text-3xl font-bold tracking-tight">{m.account_title()}</h1>
			<p class="mt-2 text-muted-foreground">{m.account_description()}</p>
		</div>

		<!-- Tabs -->
		<Tabs.Tabs value="profile" class="flex flex-col">
			<Tabs.TabsList class="rounded-lg bg-muted p-1">
				<Tabs.TabsTrigger value="profile" class="rounded-md text-sm font-medium">
					{m.account_profile_title()}
				</Tabs.TabsTrigger>
				<Tabs.TabsTrigger value="subscription" class="rounded-md text-sm font-medium">
					{m.account_subscription_title()}
				</Tabs.TabsTrigger>
				<Tabs.TabsTrigger value="security" class="rounded-md text-sm font-medium">
					{m.account_security_title()}
				</Tabs.TabsTrigger>
				<Tabs.TabsTrigger
					value="danger-zone"
					class="rounded-md text-sm font-medium data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive"
				>
					{m.account_danger_zone_title()}
				</Tabs.TabsTrigger>
			</Tabs.TabsList>

			<!-- Tab: Profile -->
			<Tabs.TabsContent
				value="profile"
				class="mt-4 rounded-xl border border-border bg-card p-6"
			>
				<div class="grid gap-4 pb-6 sm:grid-cols-2">
					<div>
						<Label class="text-xs text-muted-foreground">{m.account_name_label()}</Label
						>
						<p class="text-sm font-medium">{user.name}</p>
					</div>
					<div>
						<Label class="text-xs text-muted-foreground"
							>{m.account_email_label()}</Label
						>
						<p class="text-sm font-medium">{user.email}</p>
					</div>
				</div>

				<Separator class="my-6" />

				<div>
					<h3 class="mb-4 text-sm font-semibold">
						{m.account_change_password_title()}
					</h3>
					<Button variant="outline" onclick={() => (showPasswordDialog = true)}>
						<KeyRound class="mr-2 h-4 w-4" />
						{m.account_change_password_button()}
					</Button>
				</div>
			</Tabs.TabsContent>

			<!-- Tab: Subscription -->
			<Tabs.TabsContent
				value="subscription"
				class="mt-4 rounded-xl border border-border bg-card p-6"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="flex items-center gap-2">
							<p class="font-medium">
								{isPro ? m.account_plan_pro() : m.account_plan_free()}
							</p>
							{#if isPro && isCancelled && proExpiration}
								<Badge variant="secondary" class="text-xs">
									{m.account_pro_cancels({ date: formatDate(proExpiration) })}
								</Badge>
							{/if}
						</div>
						{#if isPro && proExpiration && !isCancelled}
							<p class="text-sm text-muted-foreground">
								{m.account_pro_expires({ date: formatDate(proExpiration) })}
							</p>
						{/if}
					</div>
					{#if isPro}
						{#if isCancelled}
							<p class="text-sm text-muted-foreground">
								{m.account_subscription_cancelled()}
							</p>
						{:else}
							<Button
								variant="outline"
								class="border-destructive text-destructive hover:bg-destructive/10"
								onclick={() => (showCancelDialog = true)}
							>
								{m.account_cancel_subscription()}
							</Button>
						{/if}
					{:else}
						<Button
							href="/get-pro"
							class="group h-11 shrink-0 rounded-xl bg-brand px-8 font-bold text-amber-950 shadow-sm transition-all duration-300 hover:bg-amber-600 hover:text-amber-50"
						>
							<Crown
								class="mr-2 h-4 w-4 transition-transform group-hover:scale-110 group-hover:rotate-12"
							/>
							{m.account_get_pro()}
						</Button>
					{/if}
				</div>

				<!-- Sync subscription status -->
				<div class="mt-4 flex items-center justify-between border-t border-border pt-4">
					<div>
						<p
							class="text-sm"
							class:text-destructive={syncResult === 'failure'}
							class:text-muted-foreground={syncResult !== 'failure'}
						>
							{#if syncResult === 'success'}
								{#if syncCooldown > 0}
									{m.account_sync_cooldown({ seconds: syncCooldown })}
								{:else}
									{m.account_sync_success()}
								{/if}
							{:else if syncResult === 'failure'}
								{m.account_sync_failure()}
							{/if}
						</p>
					</div>
					<Button
						variant="outline"
						size="sm"
						disabled={syncLoading || syncCooldown > 0}
						onclick={handleSyncSubscription}
					>
						{#if syncLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{m.account_sync_syncing()}
						{:else if syncCooldown > 0}
							<RefreshCw class="mr-2 h-4 w-4" />
							{syncCooldown}s
						{:else}
							<RefreshCw class="mr-2 h-4 w-4" />
							{m.account_sync_subscription()}
						{/if}
					</Button>
				</div>
			</Tabs.TabsContent>

			<!-- Tab: Security -->
			<Tabs.TabsContent
				value="security"
				class="mt-4 rounded-xl border border-border bg-card p-6"
			>
				<!-- 2FA -->
				<div>
					<div class="flex items-center justify-between">
						<div>
							<p class="font-medium">
								{m.account_enable_2fa()}
							</p>
							<p class="text-sm text-muted-foreground">
								{m.account_2fa_description()}
							</p>
						</div>
						{#if user.twoFactorEnabled}
							<div class="flex items-center gap-2">
								<Badge variant="outline" class="border-green-500/30 text-green-600">
									<Check class="mr-1 h-3 w-3" />
									Enabled
								</Badge>
								<Button
									variant="outline"
									size="sm"
									disabled={twoFactorLoading}
									onclick={() => (show2faDisableDialog = true)}
								>
									{#if twoFactorLoading}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										{m.account_disable_2fa()}
									{/if}
								</Button>
							</div>
						{:else}
							<Button
								variant="outline"
								size="sm"
								disabled={twoFactorLoading}
								onclick={handleEnable2FA}
							>
								{#if twoFactorLoading}
									<Loader2 class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								{m.account_enable_2fa()}
							</Button>
						{/if}
					</div>
				</div>

				<Separator class="my-6" />

				<!-- Sessions -->
				<div>
					<h3 class="mb-4 font-semibold">{m.account_sessions_title()}</h3>
					{#if sessionRevokeError}
						<p class="mb-2 text-sm text-destructive">{sessionRevokeError}</p>
					{/if}
					<div class="space-y-3">
						{#each localSessions as s}
							<div class="flex items-center justify-between rounded-lg border p-3">
								<div class="flex items-center gap-3">
									<Smartphone class="h-4 w-4 text-muted-foreground" />
									<div>
										<p class="text-sm font-medium">
											{parseUserAgent(s.userAgent)}
											{#if s.isCurrent}
												<Badge variant="secondary" class="ml-2 text-[10px]">
													{m.account_current_session()}
												</Badge>
											{/if}
										</p>
										<p class="text-xs text-muted-foreground">
											{s.ipAddress ?? 'Unknown IP'} &middot;
											{formatDate(s.createdAt)}
										</p>
									</div>
								</div>
								<Button
									variant="ghost"
									size="sm"
									disabled={s.isCurrent || revokingSessionId === s.id}
									onclick={() => handleRevokeSession(s.id)}
								>
									{#if revokingSessionId === s.id}
										<Loader2 class="h-4 w-4 animate-spin" />
									{:else}
										<X class="mr-1 h-4 w-4" />
										{m.account_revoke_session()}
									{/if}
								</Button>
							</div>
						{/each}
					</div>
				</div>
			</Tabs.TabsContent>

			<!-- Tab: Danger Zone -->
			<Tabs.TabsContent
				value="danger-zone"
				class="mt-4 rounded-xl border border-border bg-card p-6"
			>
				<div class="flex flex-col gap-4">
					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="min-w-0 flex-1 pr-4">
							<p class="font-medium">{m.account_export_data()}</p>
							<p class="text-sm text-muted-foreground">
								{m.account_export_data_description()}
							</p>
						</div>
						<Button variant="outline" size="sm" onclick={handleExportData}>
							<Download class="mr-2 h-4 w-4" />
							{m.account_export_data()}
						</Button>
					</div>

					<div class="flex items-center justify-between rounded-lg border p-4">
						<div class="min-w-0 flex-1 pr-4">
							<p class="font-medium text-destructive">
								{m.account_delete_account()}
							</p>
							<p class="text-sm text-muted-foreground">
								{m.account_delete_warning()}
							</p>
						</div>
						<Button
							variant="destructive"
							size="sm"
							onclick={() => (showDeleteDialog = true)}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							{m.account_delete_account()}
						</Button>
					</div>
				</div>
			</Tabs.TabsContent>
		</Tabs.Tabs>

		<!-- Dialogs (outside tabs) -->
		<ChangePasswordDialog bind:open={showPasswordDialog} />
		<CancelSubscriptionDialog bind:open={showCancelDialog} />
		<Disable2FADialog bind:open={show2faDisableDialog} />
		<DeleteAccountDialog bind:open={showDeleteDialog} email={user.email} />
	</div>
</div>

<Toaster position="bottom-right" />
