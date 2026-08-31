<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import * as m from '$lib/paraglide/messages.js';
	import {
		AlertTriangle,
		Database,
		Settings,
		Upload,
		UploadCloud,
		X
	} from '@lucide/svelte';
	import { fade, scale } from 'svelte/transition';
	import type { Component, Snippet } from 'svelte';
	import Panel from '$lib/components/Panel.svelte';

	interface ReleaseStat {
		label: string;
		value: string;
		accent?: boolean;
	}

	interface RowActions {
		openDetails: (item: any) => void;
		confirmDelete: (item: any) => void;
	}

	let {
		Icon,
		title,
		description,
		items,
		stats,
		statsClass = 'mb-8 grid grid-cols-1 gap-6 md:grid-cols-2',
		uploadTitle,
		uploadSubtitle,
		uploadSubtitleHighlight,
		UploadIcon = Upload,
		deployingLabel = 'Deploying...',
		fileFieldLabel = m.admin_releases_modal_file(),
		fileInputId = 'rel-f',
		DropzoneIcon = UploadCloud,
		uploadFields,
		validateUpload,
		submitUpload,
		onUploadSuccess,
		columns,
		row,
		empty,
		details,
		submitUpdate,
		submitDelete,
		confirmDeleteLabel = 'Confirm Delete',
		deleteOverlayClass = 'bg-black/80',
		deletePanelClass = 'rounded-2xl',
		deleteConfirmClass = 'hover:bg-red-500/20',
		deleteBody
	}: {
		Icon: Component;
		title: string;
		description: string;
		items: any[];
		stats: ReleaseStat[];
		statsClass?: string;
		uploadTitle: string;
		uploadSubtitle: string;
		uploadSubtitleHighlight?: string;
		UploadIcon?: Component;
		deployingLabel?: string;
		fileFieldLabel?: string;
		fileInputId?: string;
		DropzoneIcon?: Component;
		uploadFields: Snippet;
		validateUpload: (formData: FormData) => string | null;
		submitUpload: (formData: FormData) => Promise<string | null>;
		onUploadSuccess?: () => void;
		columns: Snippet;
		row: Snippet<[any, number, RowActions]>;
		empty: Snippet<[() => void]>;
		details?: Snippet<[any]>;
		submitUpdate?: (formData: FormData) => Promise<string | null>;
		submitDelete: (item: any) => Promise<string | null>;
		confirmDeleteLabel?: string;
		deleteOverlayClass?: string;
		deletePanelClass?: string;
		deleteConfirmClass?: string;
		deleteBody: Snippet<[any]>;
	} = $props();

	// ── Modal state ──────────────────────────────────────────────────────────
	let isUploadModalOpen = $state(false);
	let isDetailsModalOpen = $state(false);
	let isDeploying = $state(false);
	let isUpdating = $state(false);
	let isDeleting = $state(false);
	let selectedRelease = $state<any>(null);
	let itemToDelete = $state<any>(null);
	let isDragging = $state(false);
	let uploadError = $state<string | null>(null);
	let updateError = $state<string | null>(null);
	let uploadFile = $state<File | null>(null);

	function openUploadModal() {
		isUploadModalOpen = true;
		uploadError = null;
	}

	function openDetails(release: any) {
		selectedRelease = { ...release };
		isDetailsModalOpen = true;
		updateError = null;
	}

	function confirmDelete(item: any) {
		itemToDelete = item;
	}

	const rowActions: RowActions = { openDetails, confirmDelete };

	// ── Upload ───────────────────────────────────────────────────────────────
	async function handleDeploy(e: Event) {
		e.preventDefault();
		isDeploying = true;
		uploadError = null;

		const formData = new FormData(e.target as HTMLFormElement);

		const validationError = validateUpload(formData);
		if (validationError) {
			uploadError = validationError;
			isDeploying = false;
			return;
		}

		const error = await submitUpload(formData);
		isDeploying = false;

		if (error) {
			uploadError = error;
			return;
		}

		isUploadModalOpen = false;
		uploadFile = null;
		onUploadSuccess?.();
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
			uploadFile = e.dataTransfer.files[0];
			e.currentTarget.files = e.dataTransfer.files;
		}
	}

	// ── Update (details modal) ───────────────────────────────────────────────
	async function handleUpdate(e: Event) {
		if (!submitUpdate) return;
		e.preventDefault();
		isUpdating = true;
		updateError = null;

		const formData = new FormData(e.target as HTMLFormElement);
		const error = await submitUpdate(formData);
		isUpdating = false;

		if (error) {
			updateError = error;
			return;
		}

		isDetailsModalOpen = false;
		await invalidateAll();
	}

	// ── Delete ───────────────────────────────────────────────────────────────
	async function handleDelete() {
		if (!itemToDelete) return;

		isDeleting = true;

		const error = await submitDelete(itemToDelete);

		isDeleting = false;

		if (error) {
			alert(error);
			return;
		}

		itemToDelete = null;
		await invalidateAll();
	}
</script>

<div class="min-h-screen bg-slate-50 dark:bg-background p-8 font-sans text-slate-800 dark:text-gray-200 selection:bg-brand/30">
	<!-- Page Header -->
	<header
		class="mb-10 flex flex-col justify-between gap-4 border-b border-slate-200 dark:border-white/5 pb-6 md:flex-row md:items-center"
	>
		<div>
			<div class="mb-1 flex items-center gap-3">
				<div
					class="rounded-lg border border-brand/20 bg-brand/10 p-2 text-amber-600 dark:text-brand"
				>
					<Icon class="h-5 w-5" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-white lg:text-3xl">
					{title}
				</h1>
			</div>
			<p class="max-w-lg text-sm leading-relaxed text-slate-600 dark:text-gray-400">
				{description}
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
				onclick={openUploadModal}
				class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-brand/10 transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
			>
				<Upload class="h-4 w-4" />
				{m.admin_releases_deploy_new()}
			</button>
		</div>
	</header>

	<!-- Stats -->
	<div class={statsClass}>
		{#each stats as stat}
			<Panel variant="surface">
				<p class="mb-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase">
					{stat.label}
				</p>
				<p
					class="font-mono text-2xl font-bold {stat.accent
						? 'text-amber-600 dark:text-brand'
						: 'text-slate-900 dark:text-white'}"
				>
					{stat.value}
				</p>
			</Panel>
		{/each}
	</div>

	<!-- Data Table -->
	<div class="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] backdrop-blur-sm">
		<table class="w-full border-collapse text-left">
			<thead>
				<tr class="border-b border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5">
					{@render columns()}
				</tr>
			</thead>
			<tbody class="divide-y divide-slate-200 dark:divide-white/5">
				{#each items as item, index (item.id)}
					<tr class="group transition-colors hover:bg-slate-100 dark:hover:bg-white/5">
						{@render row(item, index, rowActions)}
					</tr>
				{:else}
					{@render empty(openUploadModal)}
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Upload Modal -->
{#if isUploadModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md animate-in overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl duration-200 zoom-in-95"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
		>
			<form onsubmit={handleDeploy}>
				<div
					class="flex items-center justify-between border-b border-slate-200 dark:border-white/5 px-6 py-5"
				>
					<div>
						<h3 class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
							<UploadIcon class="h-5 w-5 text-amber-600 dark:text-brand" />
							{uploadTitle}
						</h3>
						<p
							class="mt-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
						>
							{uploadSubtitle}
							{#if uploadSubtitleHighlight}
								<span class="text-amber-600 dark:text-brand">{uploadSubtitleHighlight}</span>
							{/if}
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isUploadModalOpen = false)}
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

					{@render uploadFields()}

					<div class="space-y-2">
						<label
							for={fileInputId}
							class="block text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
							>{fileFieldLabel}</label
						>
						<div class="group relative">
							<input
								id={fileInputId}
								type="file"
								name="file"
								class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
								onchange={(e) =>
									(uploadFile = e.currentTarget.files?.[0] || null)}
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								required
							/>
							<div
								class="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all group-hover:bg-slate-100 dark:group-hover:bg-white/5 {isDragging
									? 'border-brand bg-brand/5'
									: 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-black/20 group-hover:border-slate-400 dark:group-hover:border-white/20'}"
							>
								<div
									class="flex flex-col items-center justify-center p-5 text-center"
								>
									<DropzoneIcon
										class="mb-2 h-6 w-6 {isDragging
											? 'text-amber-600 dark:text-brand'
											: 'text-slate-500 dark:text-gray-500'}"
									/>
									{#if uploadFile}
										<p
											class="max-w-[280px] truncate font-mono text-xs text-amber-600 dark:text-brand"
										>
											{uploadFile.name}
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
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-black shadow-lg shadow-brand/10 transition-all hover:bg-amber-400 disabled:opacity-50"
					>
						{#if isDeploying}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
							></div>
							{deployingLabel}
						{:else}
							Start Deployment
						{/if}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Details / Edit Modal -->
{#if details && isDetailsModalOpen && selectedRelease}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
		>
			<form onsubmit={handleUpdate}>
				<input type="hidden" name="id" value={selectedRelease.id} />

				<div
					class="flex items-center justify-between border-b border-slate-200 dark:border-white/5 px-6 py-5"
				>
					<div>
						<h3 class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
							<Settings class="h-5 w-5 text-amber-600 dark:text-brand" />
							Pack Details
						</h3>
						<p
							class="mt-1 text-[10px] font-bold tracking-widest text-slate-500 dark:text-gray-500 uppercase"
						>
							Config Update
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isDetailsModalOpen = false)}
						class="text-slate-500 dark:text-gray-500 transition-colors hover:text-slate-900 dark:hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<div class="space-y-6 p-6">
					<div class="space-y-4">
						{#if updateError}
							<div
								class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-500"
							>
								{updateError}
							</div>
						{/if}
						{@render details(selectedRelease)}
					</div>

					<div class="pt-2">
						<button
							type="submit"
							disabled={isUpdating}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
						>
							{#if isUpdating}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
								></div>
								Saving...
							{:else}
								Save Configuration
							{/if}
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if itemToDelete}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center {deleteOverlayClass} p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md animate-in overflow-hidden {deletePanelClass} border border-slate-200 dark:border-white/10 bg-white dark:bg-card shadow-2xl duration-200 zoom-in-95 fade-in"
			role="dialog"
		>
			<div class="p-6">
				<div class="mb-4 flex items-center gap-3">
					<div class="rounded-lg bg-red-500/10 p-2 text-red-500">
						<AlertTriangle class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-bold text-slate-900 dark:text-white">Confirm Deletion</h3>
				</div>

				{@render deleteBody(itemToDelete)}

				<div class="flex justify-end gap-3 border-t border-slate-200 dark:border-white/5 pt-6">
					<button
						type="button"
						onclick={() => (itemToDelete = null)}
						class="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 dark:text-gray-400 transition-colors hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleDelete}
						disabled={isDeleting}
						class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 transition-colors {deleteConfirmClass} disabled:opacity-50"
					>
						{#if isDeleting}
							<div
								class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500/30 border-t-red-500"
							></div>
							Deleting...
						{:else}
							{confirmDeleteLabel}
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
		background-color: var(--background);
		color-scheme: dark;
	}
</style>
