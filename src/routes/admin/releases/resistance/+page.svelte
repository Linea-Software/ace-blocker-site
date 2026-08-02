<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import {
		Eye,
		EyeOff,
		Trash2,
		Upload,
		X,
		ScrollText,
		Terminal,
		UploadCloud,
		Calendar,
		Database,
		AlertTriangle
	} from '@lucide/svelte';
	import { fade, scale } from 'svelte/transition';
	import { apiClient } from '$lib/api-client';

	let { data } = $props<{ data: any }>();

	let isModalOpen = $state(false);
	let isDeploying = $state(false);
	let isDeleting = $state(false);
	let itemToDelete = $state<any>(null);
	let isDragging = $state(false);
	let uploadError = $state<string | null>(null);

	let uploadFormState = $state({
		version: '',
		file: null as File | null
	});

	function openModal() {
		isModalOpen = true;
		uploadError = null;
	}

	function formatDate(date: string | Date) {
		return new Date(date).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleDeploy(e: Event) {
		e.preventDefault();
		isDeploying = true;
		uploadError = null;

		const formData = new FormData(e.target as HTMLFormElement);
		const file = formData.get('file') as File;
		const version = formData.get('version') as string;

		if (!file || !file.size || !version) {
			uploadError = 'Missing required configuration for deploy (File or Version)';
			isDeploying = false;
			return;
		}

		const response = await apiClient.v1.admin.resistance.upload.post({
			file,
			version
		});

		isDeploying = false;

		if (response.error) {
			let message = 'Internal server failure during binary deploy';
			if (
				typeof response.error === 'object' &&
				response.error !== null &&
				'message' in response.error
			) {
				message = (response.error as { message: string }).message;
			}
			uploadError = message;
			return;
		}

		isModalOpen = false;
		uploadFormState = {
			version: '',
			file: null
		};
		await invalidateAll();
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files?.length) {
			uploadFormState.file = e.dataTransfer.files[0];
			e.currentTarget.files = e.dataTransfer.files;
		}
	}

	async function handleDelete() {
		if (!itemToDelete) return;

		isDeleting = true;

		const response = await apiClient.v1.admin.resistance.delete.post({ id: itemToDelete.id });

		isDeleting = false;

		if (response.error) {
			let message = 'Delete failed';
			if (
				typeof response.error === 'object' &&
				response.error !== null &&
				'message' in response.error
			) {
				message = (response.error as { message: string }).message;
			}
			alert(message);
			return;
		}

		itemToDelete = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{m.admin_releases_category_resistance()} — Ace Blocker Admin</title>
</svelte:head>

<div class="min-h-screen bg-slate-50 dark:bg-[#0B0F19] p-8 font-sans text-slate-800 dark:text-gray-200 selection:bg-amber-500/30">
	<!-- Page Header -->
	<header
		class="mb-10 flex flex-col justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6 md:flex-row md:items-center"
	>
		<div>
			<div class="mb-1 flex items-center gap-3">
				<div
					class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-600 dark:text-amber-500"
				>
					<ScrollText class="h-5 w-5" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">
					{m.admin_releases_category_resistance()}
				</h1>
			</div>
			<p class="max-w-lg text-sm leading-relaxed text-slate-600 dark:text-gray-400">
				Manage and deploy Resistance Mode scripts.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<div
				class="hidden items-center gap-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-3 py-1.5 font-mono text-[10px] tracking-wider text-slate-500 dark:text-gray-500 uppercase lg:flex"
			>
				<Database class="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500" />
				<span>DB Status: <span class="text-emerald-600 dark:text-emerald-400">Connected</span></span>
			</div>
			<button
				onclick={openModal}
				class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
			>
				<Upload class="h-4 w-4" />
				{m.admin_releases_deploy_new()}
			</button>
		</div>
	</header>

	<!-- Downloads Stats -->
	<div class="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
		<div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5 backdrop-blur-sm">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase">
				Total Downloads
			</p>
			<p class="font-mono text-2xl font-bold text-amber-600 dark:text-amber-500">
				{data.totalDownloads.toLocaleString()}
			</p>
		</div>
		<div class="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-5 backdrop-blur-sm">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase">
				Active Scripts
			</p>
			<p class="font-mono text-2xl font-bold text-slate-900 dark:text-white">{data.releases.length}</p>
		</div>
	</div>

	<!-- Data Table -->
	<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] backdrop-blur-sm">
		<table class="w-full border-collapse text-left">
			<thead>
				<tr class="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
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
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200 dark:divide-white/5">
				{#each data.releases as release, index (release.id)}
					<tr class="group transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
						<td class="px-6 py-4">
							<div class="flex items-center gap-2">
								<span
									class="text-sm font-semibold text-slate-900 dark:text-white transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-500"
									>{release.version}</span
								>
								{#if index === 0}
									<span
										class="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-amber-600 dark:text-amber-500 uppercase"
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
								onclick={() => (itemToDelete = release)}
								class="rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 p-2 text-slate-600 dark:text-gray-400 transition-all hover:border-red-500/30 hover:text-red-500 active:scale-90"
								title="Delete Record"
							>
								<Trash2 class="h-4 w-4" />
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-6 py-20 text-center">
							<div class="flex flex-col items-center justify-center">
								<UploadCloud class="w-10 h-10 text-slate-400 dark:text-gray-600 mb-3" />
								<p class="text-sm font-medium text-slate-600 dark:text-gray-400 mb-4">
									No releases uploaded yet.
								</p>
								<button
									onclick={openModal}
									class="bg-amber-500/10 text-amber-600 dark:text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
								>
									Deploy First Build
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Upload Modal -->
{#if isModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md animate-in overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-2xl duration-200 zoom-in-95"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
		>
			<form onsubmit={handleDeploy}>
				<div
					class="flex items-center justify-between border-b border-slate-200 dark:border-white/5 px-6 py-5 text-slate-900 dark:text-white"
				>
					<div>
						<h3 class="flex items-center gap-2 text-lg font-bold">
							<Upload class="h-5 w-5 text-amber-600 dark:text-amber-500" />
							{m.admin_releases_upload_title()}
						</h3>
						<p
							class="mt-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
						>
							Targeting: <span class="text-amber-600 dark:text-amber-500">Resistance Mode</span>
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isModalOpen = false)}
						class="text-slate-500 dark:text-gray-500 transition-colors hover:text-slate-900 dark:hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<div class="space-y-6 p-6">
					{#if uploadError}
						<div
							class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-500"
						>
							{uploadError}
						</div>
					{/if}

					<div class="space-y-1.5">
						<label
							for="rel-v"
							class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
							>{m.admin_releases_modal_version()}</label
						>
						<input
							id="rel-v"
							name="version"
							bind:value={uploadFormState.version}
							type="text"
							placeholder="e.g. v1.5.0"
							required
							class="w-full rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white transition-all outline-none focus:border-amber-500"
						/>
					</div>

					<div class="space-y-1.5">
						<label
							for="rel-f"
							class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
							>{m.admin_releases_modal_file()}</label
						>
						<div class="group relative">
							<input
								id="rel-f"
								type="file"
								name="file"
								class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
								onchange={(e) =>
									(uploadFormState.file = e.currentTarget.files?.[0] || null)}
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								required
							/>
							<div
								class="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all group-hover:bg-slate-100 dark:group-hover:bg-white/5 {isDragging
									? 'border-amber-500 bg-amber-500/5'
									: 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 group-hover:border-slate-400 dark:group-hover:border-white/20'}"
							>
								<div
									class="flex flex-col items-center justify-center p-5 text-center"
								>
									<UploadCloud
										class="h-6 w-6 {isDragging
											? 'text-amber-600 dark:text-amber-500'
											: 'text-slate-500 dark:text-gray-500'} mb-2"
									/>
									{#if uploadFormState.file}
										<p
											class="max-w-[280px] truncate font-mono text-xs text-amber-600 dark:text-amber-500"
										>
											{uploadFormState.file.name}
										</p>
									{:else}
										<p class="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase">
											{isDragging
												? 'Drop file to upload'
												: 'Click or drag & drop binary'}
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<button
						type="submit"
						disabled={isDeploying}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
					>
						{#if isDeploying}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
							></div>
							Deploying...
						{:else}
							Start Deployment
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Confirmation Modal -->
{#if itemToDelete}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md animate-in overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111827] shadow-2xl duration-200 zoom-in-95 fade-in"
			role="dialog"
		>
			<div class="p-6">
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-red-500/10 p-2 text-red-500">
						<AlertTriangle class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
				</div>
				<p class="mb-6 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
					Are you sure you want to permanently delete the resistance script <span
						class="font-semibold text-slate-900 dark:text-white">{itemToDelete.version}</span
					>
					({itemToDelete.fileName})? This action cannot be undone and will stop this
					version from being served.
				</p>
				<div class="flex justify-end gap-3 border-t border-slate-200 dark:border-white/5 pt-6">
					<button
						type="button"
						onclick={() => (itemToDelete = null)}
						class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-400 transition-colors hover:text-slate-900 dark:hover:text-white"
						>Cancel</button
					>
					<button
						type="button"
						onclick={handleDelete}
						disabled={isDeleting}
						class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
					>
						{#if isDeleting}
							<div
								class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500"
							></div>
							Deleting...
						{:else}
							Confirm Delete
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #f8fafc;
		color-scheme: light;
	}

	:global(html.dark body) {
		background-color: #0b0f19;
		color-scheme: dark;
	}
</style>
