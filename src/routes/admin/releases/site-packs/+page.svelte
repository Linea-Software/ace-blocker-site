<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import {
		List,
		Settings,
		Trash2,
		Upload,
		UploadCloud,
		Lock,
		Unlock,
		HardDrive,
		Hash,
		ExternalLink,
		Calendar
	} from '@lucide/svelte';
	import { apiClient } from '$lib/api-client';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import ReleaseManager from '../_components/ReleaseManager.svelte';

	let { data } = $props<{ data: any }>();

	// Upload form fields owned by this page (file + modal state live in ReleaseManager)
	let uploadId = $state('');
	let uploadName = $state('');
	let uploadRequiresPro = $state(true);

	function formatBytes(bytes: number, decimals = 2) {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const dm = decimals < 0 ? 0 : decimals;
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function resetUploadForm() {
		uploadId = '';
		uploadName = '';
		uploadRequiresPro = true;
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
		const name = formData.get('name') as string;
		const id = formData.get('id') as string;

		if (!file || !file.size || !name || !id) {
			return 'Missing required configuration for deploy (File, Name, or ID)';
		}
		return null;
	}

	async function submitUpload(formData: FormData): Promise<string | null> {
		const file = formData.get('file') as File;
		const name = formData.get('name') as string;
		const id = formData.get('id') as string;
		const requiresProSubscription = formData.get('requiresProSubscription') === 'true';

		console.log('Uploading:', { file: file.name, name, id, requiresProSubscription });

		const response = await apiClient.v1.admin['site-packs'].upload.post({
			file,
			name,
			id,
			requiresProSubscription
		});

		console.log('Upload response:', response);

		if (response.error) {
			console.error('Upload error:', response.error);
			return errorMessage(response, 'Internal server failure during binary deploy');
		}
		return null;
	}

	async function submitUpdate(formData: FormData): Promise<string | null> {
		const id = formData.get('id') as string;
		const name = formData.get('name') as string;
		const requiresProSubscription = formData.get('requiresProSubscription') === 'on';

		if (!id || !name) return 'Missing required fields';

		const response = await apiClient.v1.admin['site-packs'].update.post({
			id,
			name,
			requiresProSubscription
		});

		if (response.error) return errorMessage(response, 'Failed to update site pack');
		return null;
	}

	async function submitDelete(item: any): Promise<string | null> {
		const response = await apiClient.v1.admin['site-packs'].delete.post({ id: item.id });
		if (response.error) return errorMessage(response, 'Failed to delete site pack');
		return null;
	}
</script>

<svelte:head>
	<title>{m.admin_releases_category_sitepacks()} — Ace Blocker Admin</title>
</svelte:head>

{#snippet columns()}
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Name</th
	>
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>ID</th
	>
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Access</th
	>
	<th
		class="px-6 py-4 text-center text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Downloads</th
	>
	<th
		class="px-6 py-4 text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Updated</th
	>
	<th
		class="px-6 py-4 text-right text-[10px] font-bold tracking-widest text-slate-600 dark:text-gray-400 uppercase"
		>Actions</th
	>
{/snippet}

{#snippet row(pack: any, _index: number, actions: any)}
	<td class="px-6 py-4">
		<div class="flex flex-col">
			<span
				class="text-sm font-semibold text-slate-900 dark:text-white transition-colors group-hover:text-amber-600 dark:group-hover:text-brand"
				>{pack.name}</span
			>
			<span
				class="mt-0.5 text-[10px] font-bold tracking-tighter text-slate-500 dark:text-gray-500 uppercase"
				>Static Payload</span
			>
		</div>
	</td>
	<td class="px-6 py-4">
		<code
			class="rounded border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-600 dark:text-gray-400"
		>
			{pack.id.substring(0, 8)}...
		</code>
	</td>
	<td class="px-6 py-4 text-xs">
		{#if pack.requiresProSubscription}
			<span
				class="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2 py-0.5 font-medium text-amber-600 dark:text-brand"
			>
				<Lock class="h-3 w-3" />
				Pro Only
			</span>
		{:else}
			<span
				class="inline-flex items-center gap-1 rounded-full border border-slate-300 dark:border-white/20 bg-gray-100/10 px-2 py-0.5 font-medium text-slate-600 dark:text-gray-400"
			>
				<Unlock class="h-3 w-3" />
				Free
			</span>
		{/if}
	</td>
	<td class="px-6 py-4 text-center">
		<span class="font-mono text-xs text-slate-700 dark:text-gray-300"
			>{pack.downloadCount.toLocaleString()}</span
		>
	</td>
	<td class="px-6 py-4">
		<span class="flex items-center gap-1.5 text-xs text-slate-600 dark:text-gray-400">
			<Calendar class="h-3.5 w-3.5 opacity-40" />
			{formatDate(pack.updatedAt)}
		</span>
	</td>
	<td class="px-6 py-4 text-right">
		<div class="flex items-center justify-end gap-2">
			<button
				onclick={() => actions.openDetails(pack)}
				class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-gray-400 transition-all hover:border-slate-300 dark:hover:border-white/20 hover:text-slate-900 dark:hover:text-white active:scale-90"
				title="View/Edit Details"
			>
				<Settings class="h-4 w-4" />
			</button>
			<button
				type="button"
				onclick={() => actions.confirmDelete(pack)}
				class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-gray-400 transition-all hover:border-red-500/30 hover:text-red-500 active:scale-90"
				title="Delete Pack"
			>
				<Trash2 class="h-4 w-4" />
			</button>
		</div>
	</td>
{/snippet}

{#snippet empty(open: () => void)}
	<EmptyState
		colspan={6}
		Icon={UploadCloud}
		title="No release uploaded yet."
		description="Start by deploying the first site pack package to BunnyCDN."
		onaction={open}
		circle
	/>
{/snippet}

{#snippet uploadFields()}
	<input
		type="hidden"
		name="requiresProSubscription"
		value={uploadRequiresPro.toString()}
	/>

	<div class="space-y-1.5">
		<label
			for="upload-id"
			class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
			>Pack ID</label
		>
		<input
			id="upload-id"
			name="id"
			bind:value={uploadId}
			type="text"
			placeholder="e.g., adult-content-pack"
			required
			class="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none focus:border-brand focus:ring-1 focus:ring-brand"
		/>
	</div>

	<div class="space-y-1.5">
		<label
			for="upload-name"
			class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
			>Name</label
		>
		<input
			id="upload-name"
			name="name"
			bind:value={uploadName}
			type="text"
			placeholder="e.g., Adult Content Pack"
			required
			class="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none focus:border-brand focus:ring-1 focus:ring-brand"
		/>
	</div>

	<div
		class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-4"
	>
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-brand/10 p-2 text-amber-600 dark:text-brand">
				<Lock class="h-4 w-4" />
			</div>
			<div>
				<p class="text-xs font-bold text-slate-900 dark:text-white">Pro Only</p>
				<p
					class="mt-0.5 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
				>
					Subscription Required
				</p>
			</div>
		</div>
		<button
			type="button"
			onclick={() => (uploadRequiresPro = !uploadRequiresPro)}
			class="relative h-5 w-10 rounded-full transition-colors {uploadRequiresPro
				? 'bg-brand'
				: 'bg-white/10'}"
			aria-label="Toggle Pro Requirement"
		>
			<div
				class="absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-all {uploadRequiresPro
					? 'translate-x-5'
					: ''}"
			></div>
		</button>
	</div>
{/snippet}

{#snippet details(release: any)}
	<div class="space-y-1.5">
		<label
			for="edit-name"
			class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
			>Internal Name</label
		>
		<input
			id="edit-name"
			name="name"
			value={release.name}
			oninput={(e) => (release.name = (e.currentTarget as HTMLInputElement).value)}
			type="text"
			class="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none focus:border-brand"
		/>
	</div>

	<div
		class="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-4"
	>
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-brand/10 p-2 text-amber-600 dark:text-brand">
				<Lock class="h-4 w-4" />
			</div>
			<div>
				<p class="text-xs font-bold text-slate-900 dark:text-white">Pro Only</p>
				<p
					class="mt-0.5 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
				>
					Access Control
				</p>
			</div>
		</div>
		<button
			type="button"
			onclick={() =>
				(release.requiresProSubscription = !release.requiresProSubscription)}
			class="relative h-5 w-10 rounded-full transition-colors {release.requiresProSubscription
				? 'bg-brand'
				: 'bg-white/10'}"
			aria-label="Toggle Pro Requirement"
		>
			<input
				type="checkbox"
				name="requiresProSubscription"
				class="hidden"
				checked={release.requiresProSubscription}
			/>
			<div
				class="absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-all {release.requiresProSubscription
					? 'translate-x-5'
					: ''}"
			></div>
		</button>
	</div>

	<!-- Read Only Technical Data -->
	<div class="space-y-3 border-t border-slate-200 dark:border-white/5 pt-4">
		<p class="text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase">
			Technical Assets
		</p>

		<div class="grid grid-cols-2 gap-3">
			<div class="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-3">
				<div class="mb-1 flex items-center gap-2">
					<HardDrive class="h-3 w-3 text-slate-500 dark:text-gray-500" />
					<span class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase"
						>File Size</span
					>
				</div>
				<p class="font-mono text-xs text-slate-900 dark:text-white">
					{formatBytes(release.size)}
				</p>
			</div>
			<div class="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 p-3">
				<div class="mb-1 flex items-center gap-2">
					<Hash class="h-3 w-3 text-slate-500 dark:text-gray-500" />
					<span class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase"
						>SHA256</span
					>
				</div>
				<p
					class="truncate font-mono text-xs text-slate-900 dark:text-white"
					title={release.sha256}
				>
					{release.sha256.substring(0, 12)}...
				</p>
			</div>
		</div>

		<div class="space-y-1.5">
			<label
				for="edit-uuid"
				class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
				>Full UUID</label
			>
			<div class="flex gap-2">
				<input
					id="edit-uuid"
					value={release.id}
					readonly
					class="flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs text-slate-600 dark:text-gray-400 outline-none"
				/>
			</div>
		</div>

		<div class="space-y-1.5">
			<label
				for="edit-cdn"
				class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
				>CDN Link</label
			>
			<div class="flex gap-2">
				<input
					id="edit-cdn"
					value={release.downloadUrl}
					readonly
					class="flex-1 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 font-mono text-xs text-slate-600 dark:text-gray-400 outline-none"
				/>
				<a
					href={release.downloadUrl}
					target="_blank"
					class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-gray-400 hover:bg-white/10"
					aria-label="Open CDN link in new tab"
				>
					<ExternalLink class="h-4 w-4" />
				</a>
			</div>
		</div>
	</div>
{/snippet}

{#snippet deleteBody(item: any)}
	<p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
		Are you sure you want to permanently delete the site pack <span
			class="font-semibold text-slate-900 dark:text-white">{item.name}</span
		>? This action cannot be undone and will prevent the desktop client from
		downloading this package.
	</p>
{/snippet}

<ReleaseManager
	Icon={List}
	title={m.admin_releases_category_sitepacks()}
	description="Manage and deploy blocked site packs packages for the Ace Blocker engine."
	items={data.sitePacks}
	stats={[
		{ label: 'Total Downloads', value: data.totalDownloads.toLocaleString(), accent: true },
		{ label: 'Active Packs', value: String(data.sitePacks.length) },
		{ label: 'Global Storage', value: 'BunnyCDN' }
	]}
	statsClass="mb-8 grid grid-cols-1 gap-6 text-center sm:text-left md:grid-cols-3"
	uploadTitle="Deploy New Pack"
	uploadSubtitle="Package Deployment"
	UploadIcon={UploadCloud}
	DropzoneIcon={Upload}
	deployingLabel="Deploying to CDN..."
	fileFieldLabel="Payload File (.zip)"
	fileInputId="upload-file"
	uploadFields={uploadFields}
	validateUpload={validateUpload}
	submitUpload={submitUpload}
	onUploadSuccess={resetUploadForm}
	columns={columns}
	row={row}
	empty={empty}
	details={details}
	submitUpdate={submitUpdate}
	submitDelete={submitDelete}
	confirmDeleteLabel="Delete Permanently"
	deleteOverlayClass="bg-black/60"
	deletePanelClass="rounded-xl"
	deleteConfirmClass="hover:border-red-500/30 hover:bg-red-500/20"
	deleteBody={deleteBody}
/>
