<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { ShieldAlert, Trash2, UploadCloud, Calendar } from '@lucide/svelte';
	import { apiClient } from '$lib/api-client';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ReleaseManager from '../_components/ReleaseManager.svelte';

	let { data } = $props<{ data: any }>();

	// Upload form fields owned by this page (file + modal state live in ReleaseManager)
	let uploadVersion = $state('');

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function resetUploadForm() {
		uploadVersion = '';
	}

	function errorMessage(response: any, fallback: string): string {
		let message = fallback;
		if (
			typeof response.error === 'object' &&
			response.error !== null &&
			'message' in response.error
		) {
			message = (response.error as { message: string }).message;
		}
		return message;
	}

	function validateUpload(formData: FormData): string | null {
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;

		if (!file || !file.size || !version) {
			return 'Missing required configuration for deploy (File or Version)';
		}
		return null;
	}

	async function submitUpload(formData: FormData): Promise<string | null> {
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;

		const response = await apiClient.v1.admin.tracking.upload.post({ file, version });

		if (response.error) {
			return errorMessage(response, 'Internal server failure during binary deploy');
		}
		return null;
	}

	async function submitDelete(item: any): Promise<string | null> {
		const response = await apiClient.v1.admin.tracking.delete.post({ id: item.id });
		if (response.error) return errorMessage(response, 'Delete failed');
		return null;
	}
</script>

<svelte:head>
	<title>{m.admin_releases_category_tracking()} — Ace Blocker Admin</title>
</svelte:head>

{#snippet columns()}
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Version</th
	>
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>File Name</th
	>
	<th
		class="px-6 py-4 text-center text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Downloads</th
	>
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Release Date</th
	>
	<th
		class="px-6 py-4 text-right text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Actions</th
	>
{/snippet}

{#snippet row(release: any, index: number, actions: any)}
	<td class="px-6 py-4">
		<div class="flex items-center gap-2">
			<span
				class="text-sm font-semibold text-slate-900 dark:text-white transition-colors group-hover:text-amber-600 dark:group-hover:text-brand"
				>{release.version}</span
			>
			{#if index === 0}
				<span
					class="rounded border border-brand/20 bg-brand/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 dark:text-brand uppercase"
					>Latest</span
				>
			{/if}
		</div>
	</td>
	<td class="px-6 py-4">
		<code class="max-w-[200px] truncate font-mono text-[10px] text-slate-600 dark:text-gray-400"
			>{release.fileName}</code
		>
	</td>
	<td class="px-6 py-4 text-center">
		<span class="font-mono text-xs text-slate-700 dark:text-gray-300"
			>{release.downloadCount.toLocaleString()}</span
		>
	</td>
	<td class="px-6 py-4">
		<span class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
			<Calendar class="h-3.5 w-3.5 opacity-40" />
			{formatDate(release.createdAt)}
		</span>
	</td>
	<td class="px-6 py-4 text-right">
		<button
			onclick={() => actions.confirmDelete(release)}
			class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-gray-400 transition-all hover:border-red-500/30 hover:text-red-500 active:scale-90"
			title="Delete Record"
		>
			<Trash2 class="h-4 w-4" />
		</button>
	</td>
{/snippet}

{#snippet empty(open: () => void)}
	<EmptyState
		colspan={5}
		Icon={UploadCloud}
		title="No releases uploaded yet."
		onaction={open}
	/>
{/snippet}

{#snippet uploadFields()}
	<div class="space-y-1.5">
		<label
			for="rel-v"
			class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
			>{m.admin_releases_modal_version()}</label
		>
		<input
			id="rel-v"
			name="version"
			bind:value={uploadVersion}
			type="text"
			placeholder="e.g. v1.5.0"
			required
			class="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none focus:border-brand"
		/>
	</div>
{/snippet}

{#snippet deleteBody(item: any)}
	<p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
		Are you sure you want to permanently delete the tracking script <span
			class="font-semibold text-slate-900 dark:text-white">{item.version}</span
		>
		({item.fileName})? This action cannot be undone and will stop this
		version from being served.
	</p>
{/snippet}

<ReleaseManager
	Icon={ShieldAlert}
	title={m.admin_releases_category_tracking()}
	description="Manage and deploy application tracking scripts."
	items={data.releases}
	stats={[
		{ label: 'Total Downloads', value: data.totalDownloads.toLocaleString(), accent: true },
		{ label: 'Active Tracking Scripts', value: String(data.releases.length) }
	]}
	uploadTitle={m.admin_releases_upload_title()}
	uploadSubtitle="Targeting: "
	uploadSubtitleHighlight="Tracking"
	uploadFields={uploadFields}
	validateUpload={validateUpload}
	submitUpload={submitUpload}
	onUploadSuccess={resetUploadForm}
	columns={columns}
	row={row}
	empty={empty}
	submitDelete={submitDelete}
	deleteBody={deleteBody}
/>
