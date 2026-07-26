<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
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
	import { goto, invalidateAll } from '$app/navigation';
	import { toast, Toaster } from 'svelte-sonner';
	import * as m from '$lib/paraglide/messages';

	let { data } = $props();

	// ── Password change state ────────────────────────────────────────────────
	let currentPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordLoading = $state(false);
	let passwordError = $state<string | null>(null);
	let showPasswordDialog = $state(false);

	// ── Two-factor state ─────────────────────────────────────────────────────
	let twoFactorLoading = $state(false);
	let show2faDisableDialog = $state(false);

	// ── Subscription state ───────────────────────────────────────────────────
	let cancelLoading = $state(false);
	let showCancelDialog = $state(false);
	let cancelCountdown = $state(0);
	let cancelCountdownTimer: ReturnType<typeof setInterval> | null = $state(null);

	// ── Subscription sync state ──────────────────────────────────────────────
	let syncLoading = $state(false);
	let syncCooldown = $state(0);
	let syncTimer: ReturnType<typeof setInterval> | null = $state(null);
	let syncResult = $state<'success' | 'failure' | null>(null);

	// ── Delete account state ─────────────────────────────────────────────────
	let deleteEmailConfirm = $state('');
	let deleteLoading = $state(false);
	let showDeleteDialog = $state(false);
	let deleteError = $state<string | null>(null);

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

	async function handleChangePassword(e: Event) {
		e.preventDefault();
		passwordLoading = true;
		passwordError = null;

		if (newPassword !== confirmPassword) {
			passwordError = 'Passwords do not match';
			passwordLoading = false;
			return;
		}

		try {
			const res = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					currentPassword,
					newPassword
				}),
				credentials: 'include'
			});

			if (!res.ok) {
				const body = await res.json();
				throw new Error(body.message || 'Failed to change password');
			}

			toast.success(m.account_password_changed());
			currentPassword = '';
			newPassword = '';
			confirmPassword = '';
			passwordError = null;
			showPasswordDialog = false;
		} catch (err: any) {
			passwordError = err.message || m.account_password_error();
		} finally {
			passwordLoading = false;
		}
	}

	async function handleCancelSubscription() {
		cancelLoading = true;
		try {
			const res = await fetch('/api/v1/account/cancel-subscription', {
				method: 'POST',
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Failed to cancel');

			toast.success(m.account_cancel_success());
			showCancelDialog = false;
			stopCancelCountdown();
		} catch (err: any) {
			toast.error(m.account_cancel_error());
		} finally {
			cancelLoading = false;
		}
	}

	function startCancelCountdown() {
		cancelCountdown = 5;
		if (cancelCountdownTimer) clearInterval(cancelCountdownTimer);
		cancelCountdownTimer = setInterval(() => {
			cancelCountdown -= 1;
			if (cancelCountdown <= 0) {
				if (cancelCountdownTimer) clearInterval(cancelCountdownTimer);
				cancelCountdownTimer = null;
			}
		}, 1000);
	}

	function stopCancelCountdown() {
		cancelCountdown = 0;
		if (cancelCountdownTimer) clearInterval(cancelCountdownTimer);
		cancelCountdownTimer = null;
	}

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

	async function handleDisable2FA() {
		twoFactorLoading = true;
		try {
			// @ts-expect-error - twoFactor client type might not match runtime
			await authClient.twoFactor.disable();
			toast.success('Two-factor authentication disabled.');
			show2faDisableDialog = false;
		} catch (err: any) {
			toast.error(err.message || 'Failed to disable 2FA');
		} finally {
			twoFactorLoading = false;
		}
	}

	async function handleRevokeSession(token: string) {
		revokingSessionId = token;
		sessionRevokeError = null;
		try {
			const res = await fetch('/api/auth/revoke-session', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token }),
				credentials: 'include'
			});

			if (!res.ok) throw new Error('Failed to revoke');

			localSessions = localSessions.filter((s) => s.token !== token);
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

	async function handleDeleteAccount() {
		if (deleteEmailConfirm !== user.email) return;
		deleteLoading = true;
		deleteError = null;

		try {
			const res = await fetch('/api/v1/account/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: user.email }),
				credentials: 'include'
			});

			if (!res.ok) {
				const body = await res.json();
				throw new Error(typeof body === 'string' ? body : 'Failed to delete account');
			}

			goto('/?deleted=true');
		} catch (err: any) {
			deleteError = err.message || m.account_delete_error();
		} finally {
			deleteLoading = false;
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
					<Button
						variant="outline"
						onclick={() => {
							passwordError = null;
							currentPassword = '';
							newPassword = '';
							confirmPassword = '';
							showPasswordDialog = true;
						}}
					>
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
							class="group h-11 shrink-0 rounded-xl bg-amber-500 px-8 font-bold text-amber-950 shadow-sm transition-all duration-300 hover:bg-amber-600 hover:text-amber-50"
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
									disabled={s.isCurrent || revokingSessionId === s.token}
									onclick={() => handleRevokeSession(s.token)}
								>
									{#if revokingSessionId === s.token}
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

		<!-- Change Password Dialog -->
		<Dialog.Root bind:open={showPasswordDialog}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>{m.account_change_password_title()}</Dialog.Title>
					<Dialog.Description>
						Enter your current password and choose a new one.
					</Dialog.Description>
				</Dialog.Header>
				<form onsubmit={handleChangePassword}>
					<div class="space-y-4 py-4">
						<div>
							<Label
								for="modal-current-password"
								class="text-xs text-muted-foreground"
							>
								{m.account_current_password_label()}
							</Label>
							<Input
								id="modal-current-password"
								type="password"
								bind:value={currentPassword}
								required
								class="mt-1"
							/>
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<Label
									for="modal-new-password"
									class="text-xs text-muted-foreground"
								>
									{m.account_new_password_label()}
								</Label>
								<Input
									id="modal-new-password"
									type="password"
									bind:value={newPassword}
									required
									class="mt-1"
								/>
							</div>
							<div>
								<Label
									for="modal-confirm-password"
									class="text-xs text-muted-foreground"
								>
									{m.account_confirm_new_password_label()}
								</Label>
								<Input
									id="modal-confirm-password"
									type="password"
									bind:value={confirmPassword}
									required
									class="mt-1"
								/>
							</div>
						</div>
						{#if passwordError}
							<p class="text-sm text-destructive">{passwordError}</p>
						{/if}
					</div>
					<Dialog.Footer class="flex justify-end gap-2">
						<Button
							variant="outline"
							type="button"
							onclick={() => (showPasswordDialog = false)}
						>
							Cancel
						</Button>
						<Button type="submit" disabled={passwordLoading}>
							{#if passwordLoading}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							{m.account_change_password_button()}
						</Button>
					</Dialog.Footer>
				</form>
			</Dialog.Content>
		</Dialog.Root>

		<Dialog.Root
			bind:open={showCancelDialog}
			onOpenChange={(open) => {
				if (open) startCancelCountdown();
				else stopCancelCountdown();
			}}
		>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>{m.account_cancel_title()}</Dialog.Title>
					<Dialog.Description>
						{m.account_cancel_description()}
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer class="flex justify-end gap-2">
					<Button
						variant="outline"
						onclick={() => {
							showCancelDialog = false;
							stopCancelCountdown();
						}}>Cancel</Button
					>
					<Button
						variant="destructive"
						disabled={cancelLoading || cancelCountdown > 0}
						onclick={handleCancelSubscription}
					>
						{#if cancelLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{m.account_cancel_confirm()}
						{:else if cancelCountdown > 0}
							{m.account_cancel_confirm()} ({cancelCountdown}s)
						{:else}
							{m.account_cancel_confirm()}
						{/if}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<Dialog.Root bind:open={show2faDisableDialog}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title>{m.account_disable_2fa()}</Dialog.Title>
					<Dialog.Description>
						{m.account_disable_2fa_confirm()}
					</Dialog.Description>
				</Dialog.Header>
				<Dialog.Footer class="flex justify-end gap-2">
					<Button variant="outline" onclick={() => (show2faDisableDialog = false)}
						>Cancel</Button
					>
					<Button
						variant="destructive"
						disabled={twoFactorLoading}
						onclick={handleDisable2FA}
					>
						{#if twoFactorLoading}
							<Loader2 class="h-4 w-4 animate-spin" />
						{/if}
						{m.account_disable_2fa()}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>

		<Dialog.Root bind:open={showDeleteDialog}>
			<Dialog.Content class="sm:max-w-md">
				<Dialog.Header>
					<Dialog.Title class="text-destructive">
						{m.account_delete_title()}
					</Dialog.Title>
					<Dialog.Description>
						{m.account_delete_warning()}
					</Dialog.Description>
				</Dialog.Header>
				<div class="space-y-4 py-4">
					{#if deleteError}
						<p class="text-sm text-destructive">{deleteError}</p>
					{/if}
					<div>
						<Label for="delete-email-confirm" class="text-xs text-muted-foreground">
							{m.account_delete_email_confirm()}
						</Label>
						<Input
							id="delete-email-confirm"
							type="email"
							bind:value={deleteEmailConfirm}
							placeholder={user.email}
							class="mt-1"
						/>
					</div>
				</div>
				<Dialog.Footer class="flex justify-end gap-2">
					<Button
						variant="outline"
						onclick={() => {
							showDeleteDialog = false;
							deleteEmailConfirm = '';
							deleteError = null;
						}}>Cancel</Button
					>
					<Button
						variant="destructive"
						disabled={deleteLoading || deleteEmailConfirm !== user.email}
						onclick={handleDeleteAccount}
					>
						{#if deleteLoading}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						{m.account_delete_button()}
					</Button>
				</Dialog.Footer>
			</Dialog.Content>
		</Dialog.Root>
	</div>
</div>

<Toaster position="bottom-right" />
