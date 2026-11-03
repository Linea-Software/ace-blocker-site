<script lang="ts">
	import { apiClient } from '$lib/api-client';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';
	import {
		Calendar,
		ExternalLink,
		HardDrive,
		Hash,
		List,
		Lock,
		RefreshCw,
		Settings,
		Trash2,
		Unlock,
		Upload,
		UploadCloud
	} from '@lucide/svelte';
	import ReleaseManager from '../_components/ReleaseManager.svelte';

	let { data }: { data: any } = $props();
	let uploadId = $state('');
	let uploadName = $state('');
	let uploadRequiresPro = $state(true);
	type SyncStatus = {
		running: boolean;
		lastStartedAt: string | null;
		lastCompletedAt: string | null;
		lastError: string | null;
		lastResult: { release: string; updated: number; unchanged: number } | null;
	};
	let liveSyncStatus = $state<SyncStatus | null>(null);
	let syncStatus = $derived(liveSyncStatus ?? (data.syncStatus as SyncStatus));
	let syncRequestPending = $state(false);
	let syncMessage = $state('');
	let lastNotifiedCompletion: string | null = null;

	const proPacks = $derived(
		data.sitePacks.filter(
			(pack: { requiresProSubscription: boolean }) => pack.requiresProSubscription
		).length
	);

	function formatBytes(bytes: number, decimals = 2) {
		if (bytes === 0) return '0 Bytes';
		const base = 1024;
		const precision = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const index = Math.floor(Math.log(bytes) / Math.log(base));
		return `${Number.parseFloat((bytes / Math.pow(base, index)).toFixed(precision))} ${sizes[index]}`;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function refreshSyncStatus() {
		const response = await apiClient.v1.admin['site-packs']['sync-status'].get();
		if (!response.data) return;

		const completedAt = response.data.lastCompletedAt;
		const newCompletion =
			completedAt !== null &&
			completedAt !== (lastNotifiedCompletion ?? data.syncStatus.lastCompletedAt);
		liveSyncStatus = response.data;
		if (newCompletion) {
			lastNotifiedCompletion = completedAt;
			syncMessage = '';
			await invalidateAll();
		}
	}

	onMount(() => {
		const timer = setInterval(() => {
			void refreshSyncStatus().catch(() => {
				// A transient status request failure must not stop future polls.
			});
		}, 3000);
		return () => clearInterval(timer);
	});

	async function triggerSync() {
		syncRequestPending = true;
		syncMessage = '';
		try {
			const response = await apiClient.v1.admin['site-packs'].sync.post();
			if (response.error) {
				syncMessage = errorMessage(response, m.admin_sitepacks_sync_request_failed());
				return;
			}
			liveSyncStatus = { ...syncStatus, running: true, lastError: null };
			syncMessage = m.admin_sitepacks_sync_started();
			await refreshSyncStatus();
		} catch {
			syncMessage = m.admin_sitepacks_sync_request_failed();
		} finally {
			syncRequestPending = false;
		}
	}

	function resetUploadForm() {
		uploadId = '';
		uploadName = '';
		uploadRequiresPro = true;
	}

	function errorMessage(response: any, fallback: string): string {
		if (
			typeof response.error === 'object' &&
			response.error !== null &&
			'message' in response.error
		) {
			return String(response.error.message);
		}
		return fallback;
	}

	function validateUpload(formData: FormData): string | null {
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const id = formData.get('id') as string;
		return !file?.size || !name || !id ? m.admin_releases_missing_pack_fields() : null;
	}

	async function submitUpload(formData: FormData): Promise<string | null> {
		const response = await apiClient.v1.admin['site-packs'].upload.post({
			file: formData.get('file') as File,
			name: formData.get('name') as string,
			id: formData.get('id') as string,
			requiresProSubscription: formData.get('requiresProSubscription') === 'true'
		});

		return response.error ? errorMessage(response, m.admin_releases_upload_fallback()) : null;
	}

	async function submitUpdate(formData: FormData): Promise<string | null> {
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		if (!id || !name) return m.admin_releases_missing_required_fields();

		const response = await apiClient.v1.admin['site-packs'].update.post({
			id,
			name,
			requiresProSubscription: formData.get('requiresProSubscription') === 'on'
		});
		return response.error ? errorMessage(response, m.admin_releases_update_fallback()) : null;
	}

	async function submitDelete(item: any): Promise<string | null> {
		const response = await apiClient.v1.admin['site-packs'].delete.post({ id: item.id });
		return response.error
			? errorMessage(response, m.admin_releases_delete_pack_fallback())
			: null;
	}
</script>

<svelte:head>
	<title>{m.admin_releases_site_packs_page_title()}</title>
</svelte:head>

{#snippet columns()}
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_name()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_id()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_access()}</th
	>
	<th class="h-11 px-5 text-center text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_downloads()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_updated()}</th
	>
	<th class="h-11 px-5 text-right text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_actions()}</th
	>
{/snippet}

{#snippet row(pack: any, _index: number, actions: any)}
	<td class="px-5 py-4">
		<div class="flex min-w-48 flex-col">
			<span class="font-medium">{pack.name}</span>
			<span class="text-xs text-muted-foreground">{m.admin_releases_static_payload()}</span>
		</div>
	</td>
	<td class="px-5 py-4">
		<code class="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground" title={pack.id}>
			{pack.id.substring(0, 8)}…
		</code>
	</td>
	<td class="px-5 py-4">
		{#if pack.requiresProSubscription}
			<Badge><Lock aria-hidden="true" />{m.admin_releases_pro_only()}</Badge>
		{:else}
			<Badge variant="outline"><Unlock aria-hidden="true" />{m.admin_users_free()}</Badge>
		{/if}
	</td>
	<td class="px-5 py-4 text-center font-mono text-sm">{pack.downloadCount.toLocaleString()}</td>
	<td class="px-5 py-4">
		<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
			<Calendar class="size-4" aria-hidden="true" />
			{formatDate(pack.updatedAt)}
		</span>
	</td>
	<td class="px-5 py-4">
		<div class="flex items-center justify-end gap-1">
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => actions.openDetails(pack)}
				title={m.admin_releases_edit_pack()}
			>
				<Settings aria-hidden="true" />
				<span class="sr-only">{m.admin_releases_edit_pack()}</span>
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => actions.confirmDelete(pack)}
				title={m.admin_releases_delete_pack()}
			>
				<Trash2 aria-hidden="true" />
				<span class="sr-only">{m.admin_releases_delete_pack()}</span>
			</Button>
		</div>
	</td>
{/snippet}

{#snippet empty(open: () => void)}
	<EmptyState
		colspan={6}
		Icon={UploadCloud}
		title={m.admin_releases_empty_packs_title()}
		description={m.admin_releases_empty_packs_description()}
		actionLabel={m.admin_releases_deploy_first()}
		onaction={open}
	/>
{/snippet}

{#snippet uploadFields()}
	<input type="hidden" name="requiresProSubscription" value={uploadRequiresPro.toString()} />
	<div class="flex flex-col gap-2">
		<Label for="upload-id">{m.admin_releases_pack_id()}</Label>
		<Input
			id="upload-id"
			name="id"
			bind:value={uploadId}
			placeholder={m.admin_releases_pack_id_placeholder()}
			required
		/>
	</div>
	<div class="flex flex-col gap-2">
		<Label for="upload-name">{m.admin_releases_modal_name()}</Label>
		<Input
			id="upload-name"
			name="name"
			bind:value={uploadName}
			placeholder={m.admin_releases_pack_name_placeholder()}
			required
		/>
	</div>
	<label
		class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4"
	>
		<span class="flex items-center gap-3">
			<span
				class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
			>
				<Lock class="size-4" aria-hidden="true" />
			</span>
			<span class="flex flex-col">
				<span class="text-sm font-medium">{m.admin_releases_pro_only()}</span>
				<span class="text-xs text-muted-foreground"
					>{m.admin_releases_subscription_required()}</span
				>
			</span>
		</span>
		<input class="size-4 accent-primary" type="checkbox" bind:checked={uploadRequiresPro} />
	</label>
{/snippet}

{#snippet details(release: any)}
	<div class="flex flex-col gap-2">
		<Label for="edit-name">{m.admin_releases_internal_name()}</Label>
		<Input
			id="edit-name"
			name="name"
			value={release.name}
			oninput={(event) => (release.name = event.currentTarget.value)}
		/>
	</div>

	<label
		class="flex cursor-pointer items-center justify-between gap-4 rounded-xl border bg-muted/30 p-4"
	>
		<span class="flex items-center gap-3">
			<span
				class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
			>
				<Lock class="size-4" aria-hidden="true" />
			</span>
			<span class="flex flex-col">
				<span class="text-sm font-medium">{m.admin_releases_pro_only()}</span>
				<span class="text-xs text-muted-foreground"
					>{m.admin_releases_access_control()}</span
				>
			</span>
		</span>
		<input
			class="size-4 accent-primary"
			type="checkbox"
			name="requiresProSubscription"
			bind:checked={release.requiresProSubscription}
		/>
	</label>

	<div class="flex flex-col gap-3 border-t pt-5">
		<p class="text-sm font-medium">{m.admin_releases_technical_assets()}</p>
		<div class="grid gap-3 sm:grid-cols-2">
			<div class="rounded-lg border bg-muted/30 p-3">
				<p class="flex items-center gap-2 text-xs text-muted-foreground">
					<HardDrive class="size-3" aria-hidden="true" />
					{m.admin_releases_file_size()}
				</p>
				<p class="mt-1 font-mono text-sm">{formatBytes(release.size)}</p>
			</div>
			<div class="rounded-lg border bg-muted/30 p-3">
				<p class="flex items-center gap-2 text-xs text-muted-foreground">
					<Hash class="size-3" aria-hidden="true" />
					{m.admin_releases_sha256()}
				</p>
				<p class="mt-1 truncate font-mono text-sm" title={release.sha256}>
					{release.sha256.substring(0, 12)}…
				</p>
			</div>
		</div>
		<div class="flex flex-col gap-2">
			<Label for="edit-uuid">{m.admin_releases_full_uuid()}</Label>
			<Input id="edit-uuid" value={release.id} readonly class="font-mono text-xs" />
		</div>
		<div class="flex flex-col gap-2">
			<Label for="edit-cdn">{m.admin_releases_cdn_link()}</Label>
			<div class="flex gap-2">
				<Input
					id="edit-cdn"
					value={release.downloadUrl}
					readonly
					class="font-mono text-xs"
				/>
				<Button
					variant="outline"
					size="icon"
					href={release.downloadUrl}
					target="_blank"
					rel="noreferrer"
					title={m.admin_releases_open_cdn()}
				>
					<ExternalLink aria-hidden="true" />
					<span class="sr-only">{m.admin_releases_open_cdn()}</span>
				</Button>
			</div>
		</div>
	</div>
{/snippet}

{#snippet deleteBody(item: any)}
	<p class="text-sm text-muted-foreground">
		{m.admin_releases_delete_site_pack({ name: item.name })}
	</p>
{/snippet}

<section
	class="mb-6 flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
>
	<div class="flex flex-col gap-2">
		<h2 class="text-base font-semibold">{m.admin_sitepacks_sync_title()}</h2>
		<p class="max-w-2xl text-sm text-muted-foreground">
			{m.admin_sitepacks_sync_description()}
		</p>
		{#if syncStatus.running}
			<p class="text-sm" role="status">{m.admin_sitepacks_sync_running()}</p>
		{:else if syncStatus.lastError}
			<p class="text-sm text-destructive" role="alert">
				{m.admin_sitepacks_sync_failed()}: {syncStatus.lastError}
			</p>
		{:else if syncStatus.lastResult}
			<p class="text-sm" role="status">
				{m.admin_sitepacks_sync_complete({
					release: syncStatus.lastResult.release,
					updated: String(syncStatus.lastResult.updated),
					unchanged: String(syncStatus.lastResult.unchanged)
				})}
			</p>
		{:else}
			<p class="text-sm text-muted-foreground">{m.admin_sitepacks_sync_never()}</p>
		{/if}
		{#if syncStatus.lastCompletedAt}
			<p class="text-xs text-muted-foreground">
				{m.admin_sitepacks_sync_last_completed({
					date: formatDate(syncStatus.lastCompletedAt)
				})}
			</p>
		{/if}
		{#if syncMessage}
			<p class="text-sm" role="status">{syncMessage}</p>
		{/if}
	</div>
	<Button
		variant="outline"
		disabled={syncRequestPending || syncStatus.running}
		onclick={triggerSync}
	>
		<RefreshCw class={syncStatus.running ? 'animate-spin' : undefined} aria-hidden="true" />
		{m.admin_sitepacks_sync_button()}
	</Button>
</section>

<ReleaseManager
	Icon={List}
	title={m.admin_releases_category_sitepacks()}
	description={m.admin_releases_site_packs_description()}
	items={data.sitePacks}
	stats={[
		{
			label: m.admin_releases_total_downloads(),
			value: data.totalDownloads.toLocaleString(),
			accent: true
		},
		{ label: m.admin_releases_active_packs(), value: String(data.sitePacks.length) },
		{ label: m.admin_releases_pro_packs(), value: String(proPacks) }
	]}
	uploadTitle={m.admin_releases_upload_pack_title()}
	uploadSubtitle={m.admin_releases_upload_pack_description()}
	UploadIcon={UploadCloud}
	DropzoneIcon={Upload}
	deployingLabel={m.admin_releases_deploying_to_cdn()}
	fileFieldLabel={m.admin_releases_pack_file_label()}
	fileInputId="site-pack-file"
	{uploadFields}
	{validateUpload}
	{submitUpload}
	onUploadSuccess={resetUploadForm}
	{columns}
	{row}
	{empty}
	{details}
	{submitUpdate}
	{submitDelete}
	confirmDeleteLabel={m.admin_releases_delete_permanently()}
	{deleteBody}
/>
