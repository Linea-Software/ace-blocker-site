<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { apiClient } from '$lib/api-client';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as m from '$lib/paraglide/messages';
	import { Calendar, Eye, EyeOff, ScrollText, Trash2, UploadCloud } from '@lucide/svelte';
	import ReleaseManager from '../_components/ReleaseManager.svelte';

	let { data }: { data: any } = $props();
	let uploadVersion = $state('');

	const liveScripts = $derived(
		data.releases.filter((release: { canBeDownloaded: boolean }) => release.canBeDownloaded)
			.length
	);

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
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
		const version = formData.get('version') as string;
		return !file?.size || !version ? m.admin_releases_missing_file_version() : null;
	}

	async function submitUpload(formData: FormData): Promise<string | null> {
		const response = await apiClient.v1.admin.resistance.upload.post({
			file: formData.get('file') as File,
			version: formData.get('version') as string
		});
		return response.error ? errorMessage(response, m.admin_releases_upload_fallback()) : null;
	}

	async function submitDelete(item: any): Promise<string | null> {
		const response = await apiClient.v1.admin.resistance.delete.post({ id: item.id });
		return response.error ? errorMessage(response, m.admin_releases_delete_fallback()) : null;
	}

	async function toggleDownloadable(item: any) {
		const response = await apiClient.v1.admin.resistance['set-downloadable'].post({
			id: item.id,
			canBeDownloaded: !item.canBeDownloaded
		});
		if (response.error) {
			alert(errorMessage(response, m.admin_releases_availability_fallback()));
			return;
		}
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{m.admin_releases_resistance_page_title()}</title>
</svelte:head>

{#snippet columns()}
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_version()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_file_name()}</th
	>
	<th class="h-11 px-5 text-center text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_status()}</th
	>
	<th class="h-11 px-5 text-center text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_downloads()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_release_date()}</th
	>
	<th class="h-11 px-5 text-right text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_actions()}</th
	>
{/snippet}

{#snippet row(release: any, index: number, actions: any)}
	<td class="px-5 py-4">
		<div class="flex items-center gap-2">
			<span class="font-medium">{release.version}</span>
			{#if index === 0 && release.canBeDownloaded}
				<Badge variant="outline">{m.admin_releases_latest()}</Badge>
			{/if}
		</div>
	</td>
	<td class="px-5 py-4">
		<code class="block max-w-64 truncate text-xs text-muted-foreground">{release.fileName}</code
		>
	</td>
	<td class="px-5 py-4 text-center">
		{#if release.canBeDownloaded}
			<Badge variant="secondary"
				><Eye aria-hidden="true" />{m.admin_releases_status_live()}</Badge
			>
		{:else}
			<Badge variant="outline"
				><EyeOff aria-hidden="true" />{m.admin_releases_status_staged()}</Badge
			>
		{/if}
	</td>
	<td class="px-5 py-4 text-center font-mono text-sm">{release.downloadCount.toLocaleString()}</td
	>
	<td class="px-5 py-4">
		<span class="flex items-center gap-1.5 text-sm text-muted-foreground">
			<Calendar class="size-4" aria-hidden="true" />
			{formatDate(release.createdAt)}
		</span>
	</td>
	<td class="px-5 py-4">
		<div class="flex items-center justify-end gap-2">
			<Button
				variant={release.canBeDownloaded ? 'outline' : 'default'}
				size="sm"
				onclick={() => toggleDownloadable(release)}
				title={release.canBeDownloaded
					? m.admin_releases_withdraw_resistance_tooltip()
					: m.admin_releases_publish_resistance_tooltip()}
			>
				{release.canBeDownloaded
					? m.admin_releases_withdraw()
					: m.admin_releases_make_available()}
			</Button>
			<Button
				variant="ghost"
				size="icon-sm"
				onclick={() => actions.confirmDelete(release)}
				title={m.admin_releases_delete_record()}
			>
				<Trash2 aria-hidden="true" />
				<span class="sr-only">{m.admin_releases_delete_record()}</span>
			</Button>
		</div>
	</td>
{/snippet}

{#snippet empty(open: () => void)}
	<EmptyState
		colspan={6}
		Icon={UploadCloud}
		title={m.admin_releases_empty_resistance_title()}
		description={m.admin_releases_empty_resistance_description()}
		actionLabel={m.admin_releases_deploy_first()}
		onaction={open}
	/>
{/snippet}

{#snippet uploadFields()}
	<div class="flex flex-col gap-2">
		<Label for="resistance-version">{m.admin_releases_modal_version()}</Label>
		<Input
			id="resistance-version"
			name="version"
			bind:value={uploadVersion}
			placeholder={m.admin_releases_version_placeholder()}
			required
		/>
	</div>
{/snippet}

{#snippet deleteBody(item: any)}
	<p class="text-sm text-muted-foreground">
		{m.admin_releases_delete_resistance({ version: item.version, fileName: item.fileName })}
	</p>
{/snippet}

<ReleaseManager
	Icon={ScrollText}
	title={m.admin_releases_category_resistance()}
	description={m.admin_releases_resistance_description()}
	items={data.releases}
	stats={[
		{
			label: m.admin_releases_total_downloads(),
			value: data.totalDownloads.toLocaleString(),
			accent: true
		},
		{ label: m.admin_releases_active_scripts(), value: String(data.releases.length) },
		{ label: m.admin_releases_published_scripts(), value: String(liveScripts) }
	]}
	uploadTitle={m.admin_releases_upload_resistance_title()}
	uploadSubtitle={m.admin_releases_upload_resistance_description()}
	fileFieldLabel={m.admin_releases_resistance_file_label()}
	fileInputId="resistance-file"
	{uploadFields}
	{validateUpload}
	{submitUpload}
	onUploadSuccess={() => (uploadVersion = '')}
	{columns}
	{row}
	{empty}
	{submitDelete}
	{deleteBody}
/>
