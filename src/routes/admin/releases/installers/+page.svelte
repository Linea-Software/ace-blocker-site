<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { apiClient } from '$lib/api-client';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as m from '$lib/paraglide/messages';
	import { expectedInstallerFile } from '$lib/installer-release-policy';
	import {
		installerActionBlock,
		type InstallerActionBlock,
		type InstallerRecord
	} from '$lib/installer-publication-ui';
	import {
		Calendar,
		Cpu,
		Eye,
		EyeOff,
		HardDrive,
		FileArchive,
		ShieldCheck,
		Layers,
		Trash2,
		UploadCloud
	} from '@lucide/svelte';
	import ReleaseManager from '../_components/ReleaseManager.svelte';

	let { data }: { data: any } = $props();
	let uploadVersion = $state('');
	let uploadOs = $state('linux');
	const expectedName = $derived(expectedInstallerFile(uploadOs, uploadVersion || '0.1.0'));

	const liveBuilds = $derived(
		data.installers.filter(
			(installer: { canBeDownloaded: boolean; artifactValidatedAt: string | Date | null }) =>
				installer.canBeDownloaded && !!installer.artifactValidatedAt
		).length
	);

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function resetUploadForm() {
		uploadVersion = '';
		uploadOs = 'linux';
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
		if (!file?.size || !version) return m.admin_releases_missing_file_version();
		if (!data.allowUnsignedPublishing && uploadOs === 'windows')
			return m.admin_releases_manual_windows_production();
		if (!/^\d+\.\d+\.\d+$/.test(version)) return m.admin_releases_expected_version();
		const expected = expectedInstallerFile(uploadOs, version);
		return file.name !== expected
			? m.admin_releases_expected_filename({ filename: expected ?? '' })
			: null;
	}

	async function submitUpload(formData: FormData): Promise<string | null> {
		const response = await apiClient.v1.admin.installers.upload.post({
			file: formData.get('file') as File,
			version: formData.get('version') as string,
			os: formData.get('os') as 'windows' | 'linux',
			architecture: 'x64'
		});

		return response.error ? errorMessage(response, m.admin_releases_upload_fallback()) : null;
	}

	async function submitDelete(item: any): Promise<string | null> {
		const response = await apiClient.v1.admin.installers.delete.post({ id: item.id });
		return response.error ? errorMessage(response, m.admin_releases_delete_fallback()) : null;
	}

	function actionBlock(release: InstallerRecord): InstallerActionBlock | null {
		return installerActionBlock(release, data.installers, data.allowUnsignedPublishing);
	}

	function actionBlockMessage(block: InstallerActionBlock): string {
		switch (block) {
			case 'unverified':
				return m.admin_releases_unverified_reason();
			case 'withdrawn':
				return m.admin_releases_withdrawn_reason();
			case 'linked_linux':
				return m.admin_releases_linux_linked_reason();
			case 'manual_windows':
				return m.admin_releases_manual_windows_production();
			case 'manual_linux':
				return m.admin_releases_manual_linux_production();
			case 'missing_linux':
				return m.admin_releases_missing_linux_companion();
			case 'unavailable':
				return m.admin_releases_unavailable_reason();
		}
	}

	async function toggleDownloadable(item: any) {
		if (item.updateState && item.updateState !== 'legacy') {
			const response =
				item.updateState === 'staged'
					? await apiClient.v1.admin.installers['publish-desktop'].post({ id: item.id })
					: await apiClient.v1.admin.installers['withdraw-desktop'].post({ id: item.id });
			if (response.error) {
				alert(errorMessage(response, m.admin_releases_availability_fallback()));
				return;
			}
			await invalidateAll();
			return;
		}
		const response = await apiClient.v1.admin.installers['set-downloadable'].post({
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
	<title>{m.admin_releases_installers_page_title()}</title>
</svelte:head>

{#snippet columns()}
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_version()}</th
	>
	<th class="h-11 px-5 text-xs font-medium text-muted-foreground"
		>{m.admin_releases_column_file()}</th
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
	{@const blocked = actionBlock(release)}
	<td class="px-5 py-4">
		<div class="flex items-center gap-2">
			<span class="font-medium">{release.version}</span>
			{#if index === 0 && release.canBeDownloaded}
				<Badge variant="outline">{m.admin_releases_latest()}</Badge>
			{/if}
		</div>
	</td>
	<td class="px-5 py-4">
		<div class="flex min-w-48 flex-col gap-1">
			<code class="max-w-56 truncate text-xs text-muted-foreground">{release.fileName}</code>
			<div class="flex items-center gap-3 text-xs text-muted-foreground">
				<span class="flex items-center gap-1"
					><Layers class="size-3" aria-hidden="true" />{release.os}</span
				>
				<span class="flex items-center gap-1"
					><Cpu class="size-3" aria-hidden="true" />{release.architecture}</span
				>
			</div>
			<div class="flex items-center gap-1 text-xs text-muted-foreground">
				{#if release.artifactValidatedAt}
					<ShieldCheck
						class="size-3.5 text-emerald-600 dark:text-emerald-400"
						aria-hidden="true"
					/>
					{m.admin_releases_file_validated()}
				{:else}
					{m.admin_releases_file_unverified()}
				{/if}
			</div>
			<p class="text-xs text-muted-foreground">
				{release.updateState !== 'legacy' && release.signedEnvelope
					? m.admin_releases_signed_candidate()
					: m.admin_releases_legacy_candidate()}
			</p>
		</div>
	</td>
	<td class="px-5 py-4 text-center">
		{#if release.canBeDownloaded && release.artifactValidatedAt}
			<Badge variant="secondary"
				><Eye aria-hidden="true" />{m.admin_releases_status_live()}</Badge
			>
		{:else}
			<Badge variant="outline"
				><EyeOff aria-hidden="true" />{release.updateState === 'withdrawn'
					? m.admin_releases_signed_withdrawn()
					: m.admin_releases_status_staged()}</Badge
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
		<div class="flex flex-col items-end gap-1.5">
			<div class="flex items-center justify-end gap-2">
				<Button
					variant={release.canBeDownloaded ? 'outline' : 'default'}
					size="sm"
					disabled={blocked !== null}
					onclick={() => toggleDownloadable(release)}
					title={blocked
						? actionBlockMessage(blocked)
						: release.canBeDownloaded
							? m.admin_releases_withdraw_installer_tooltip()
							: m.admin_releases_publish_installer_tooltip()}
				>
					{release.canBeDownloaded
						? m.admin_releases_withdraw()
						: m.admin_releases_make_available()}
				</Button>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => actions.confirmDelete(release)}
					disabled={release.updateState && release.updateState !== 'legacy'}
					title={m.admin_releases_delete_record()}
				>
					<Trash2 aria-hidden="true" />
					<span class="sr-only">{m.admin_releases_delete_record()}</span>
				</Button>
			</div>
			{#if blocked}
				<p class="max-w-64 text-right text-xs leading-relaxed text-muted-foreground">
					{actionBlockMessage(blocked)}
				</p>
			{/if}
		</div>
	</td>
{/snippet}

{#snippet empty(open: () => void)}
	<EmptyState
		colspan={6}
		Icon={UploadCloud}
		title={m.admin_releases_empty_installers_title()}
		description={m.admin_releases_empty_installers_description()}
		actionLabel={m.admin_releases_deploy_first()}
		onaction={open}
	/>
{/snippet}

{#snippet uploadFields()}
	<div class="flex flex-col gap-2">
		<Label for="installer-version">{m.admin_releases_modal_version()}</Label>
		<Input
			id="installer-version"
			name="version"
			bind:value={uploadVersion}
			placeholder={m.admin_releases_expected_version_placeholder()}
			required
		/>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		<div class="flex flex-col gap-2">
			<Label for="installer-os">{m.admin_releases_modal_os()}</Label>
			<Select.Root type="single" name="os" bind:value={uploadOs}>
				<Select.Trigger id="installer-os"
					>{uploadOs === 'linux' ? 'Linux' : 'Windows'}</Select.Trigger
				>
				<Select.Content>
					<Select.Group>
						{#if data.allowUnsignedPublishing}
							<Select.Item value="windows" label="Windows">Windows</Select.Item>
						{/if}
						<Select.Item value="linux" label="Linux">Linux</Select.Item>
					</Select.Group>
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex flex-col gap-2">
			<Label>{m.admin_releases_modal_arch()}</Label>
			<div
				class="flex min-h-9 items-center rounded-md border bg-muted/30 px-3 font-mono text-sm"
			>
				x64
			</div>
			<input type="hidden" name="architecture" value="x64" />
		</div>
	</div>
	<div
		class="border-l-2 border-amber-500 bg-muted/40 px-4 py-3"
		aria-label={m.admin_releases_expected_artifact()}
	>
		<div class="flex items-center gap-2 text-sm font-medium">
			<FileArchive class="size-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
			{m.admin_releases_expected_artifact()}
		</div>
		<code class="mt-2 block font-mono text-xs font-medium break-all">{expectedName}</code>
		<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
			{uploadOs === 'windows'
				? m.admin_releases_windows_upload_help()
				: m.admin_releases_linux_upload_help()}
		</p>
	</div>
{/snippet}

{#snippet deleteBody(item: any)}
	<p class="text-sm text-muted-foreground">
		{m.admin_releases_delete_installer({ version: item.version, fileName: item.fileName })}
	</p>
{/snippet}

<div
	class="mb-5 border-l-2 border-amber-500 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground"
>
	{data.allowUnsignedPublishing
		? m.admin_releases_development_policy()
		: m.admin_releases_production_policy()}
</div>

<ReleaseManager
	Icon={HardDrive}
	title={m.admin_releases_category_installers()}
	description={m.admin_releases_installers_description()}
	items={data.installers}
	stats={[
		{
			label: m.admin_releases_total_downloads(),
			value: data.totalDownloads.toLocaleString(),
			accent: true
		},
		{ label: m.admin_releases_active_builds(), value: String(data.installers.length) },
		{ label: m.admin_releases_published_builds(), value: String(liveBuilds) }
	]}
	uploadTitle={m.admin_releases_upload_installer_title()}
	uploadSubtitle={m.admin_releases_upload_installer_description()}
	fileFieldLabel={m.admin_releases_installer_file_label()}
	fileInputId="installer-file"
	fileAccept={uploadOs === 'windows' ? '.msi' : '.tar.gz,application/gzip'}
	{uploadFields}
	{validateUpload}
	{submitUpload}
	onUploadSuccess={resetUploadForm}
	{columns}
	{row}
	{empty}
	{submitDelete}
	{deleteBody}
/>
