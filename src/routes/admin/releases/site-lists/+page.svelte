<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import type { ActionData, SubmitFunction } from './$types';
	import {
		Eye,
		Trash2,
		Upload,
		X,
		List,
		Terminal,
		UploadCloud,
		Lock,
		Unlock,
		Settings,
		Hash,
		HardDrive,
		ExternalLink,
		Database,
		Calendar
	} from '@lucide/svelte';
	import { fade, scale } from 'svelte/transition';

	let { data, form } = $props<{ data: any; form: ActionData }>();

	// Modals State
	let isUploadModalOpen = $state(false);
	let isDetailsModalOpen = $state(false);
	let isDeploying = $state(false);
	let isUpdating = $state(false);
	let selectedRelease = $state<any>(null);

	// Upload Form State
	let uploadFormState = $state({
		name: '',
		file: null as File | null,
		requiresProSubscription: true
	});

	function openUploadModal() {
		isUploadModalOpen = true;
	}

	function openDetails(release: any) {
		selectedRelease = { ...release };
		isDetailsModalOpen = true;
	}


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

	const handleDeploy: SubmitFunction = () => {
		isDeploying = true;
		return async ({ result, update }) => {
			await update();
			isDeploying = false;
			if (result.type === 'success') {
				isUploadModalOpen = false;
				uploadFormState = {
					name: '',
					file: null,
					requiresProSubscription: true
				};
			}
		};
	};

	const handleUpdate: SubmitFunction = () => {
		isUpdating = true;
		return async ({ result, update }) => {
			await update();
			isUpdating = false;
			if (result.type === 'success') {
				isDetailsModalOpen = false;
			}
		};
	};
</script>

<svelte:head>
	<title>{m.admin_releases_category_sitelists()} | Ace Blocker Admin</title>
</svelte:head>

<div class="min-h-screen bg-[#0B0F19] p-8 font-sans text-gray-200 selection:bg-amber-500/30">
	<!-- Page Header -->
	<header
		class="mb-10 flex flex-col justify-between gap-4 border-b border-white/5 pb-6 md:flex-row md:items-center"
	>
		<div>
			<div class="mb-1 flex items-center gap-3">
				<div class="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-amber-500">
					<List class="h-5 w-5" />
				</div>
				<h1 class="text-2xl font-bold tracking-tight text-white lg:text-3xl">
					{m.admin_releases_category_sitelists()}
				</h1>
			</div>
			<p class="max-w-lg text-sm leading-relaxed text-gray-400">
				Manage and deploy blocked site lists packages for the Ace Blocker engine.
			</p>
		</div>

		<div class="flex items-center gap-3">
			<div
				class="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[10px] tracking-wider text-gray-500 uppercase lg:flex"
			>
				<Database class="h-3.5 w-3.5 text-emerald-500" />
				<span>DB Status: <span class="text-emerald-400">Connected</span></span>
			</div>
			<button
				onclick={openUploadModal}
				class="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] hover:bg-amber-400 active:scale-95"
			>
				<Upload class="h-4 w-4" />
				{m.admin_releases_deploy_new()}
			</button>
		</div>
	</header>

	<!-- Downloads Stats -->
	<div class="mb-8 grid grid-cols-1 gap-6 text-center sm:text-left md:grid-cols-3">
		<div class="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
				Total Downloads
			</p>
			<p class="font-mono text-2xl font-bold text-amber-500">
				{data.totalDownloads.toLocaleString()}
			</p>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Active Lists</p>
			<p class="font-mono text-2xl font-bold text-white">{data.siteLists.length}</p>
		</div>
		<div class="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
			<p class="mb-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
				Global Storage
			</p>
			<p class="font-mono text-2xl font-bold text-white">BunnyCDN</p>
		</div>
	</div>

	<!-- Data Table -->
	<div class="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm">
		<table class="w-full border-collapse text-left">
			<thead>
				<tr class="border-b border-white/10 bg-white/5">
					<th class="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Name</th
					>
					<th class="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">ID</th
					>
					<th class="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Access</th
					>
					<th
						class="px-6 py-4 text-center text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Downloads</th
					>
					<th class="px-6 py-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Updated</th
					>
					<th
						class="px-6 py-4 text-right text-[10px] font-bold tracking-widest text-gray-400 uppercase"
						>Actions</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-white/5">
				{#each data.siteLists as list (list.id)}
					<tr class="group transition-colors hover:bg-white/5">
						<td class="px-6 py-4">
							<div class="flex flex-col">
								<span
									class="text-sm font-semibold text-white transition-colors group-hover:text-amber-500"
									>{list.name}</span
								>
								<span class="mt-0.5 text-[10px] font-bold tracking-tighter text-gray-500 uppercase"
									>Static Payload</span
								>
							</div>
						</td>
						<td class="px-6 py-4">
							<code
								class="rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-gray-400"
							>
								{list.id.substring(0, 8)}...
							</code>
						</td>
						<td class="px-6 py-4 text-xs">
							{#if list.requiresProSubscription}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-medium text-amber-500"
								>
									<Lock class="h-3 w-3" />
									Pro Only
								</span>
							{:else}
								<span
									class="inline-flex items-center gap-1 rounded-full border border-white/20 bg-gray-100/10 px-2 py-0.5 font-medium text-gray-400"
								>
									<Unlock class="h-3 w-3" />
									Free
								</span>
							{/if}
						</td>
						<td class="px-6 py-4 text-center">
							<span class="font-mono text-xs text-gray-300"
								>{list.downloadCount.toLocaleString()}</span
							>
						</td>
						<td class="px-6 py-4">
							<span class="flex items-center gap-1.5 text-xs text-gray-400">
								<Calendar class="h-3.5 w-3.5 opacity-40" />
								{formatDate(list.updatedAt)}
							</span>
						</td>
						<td class="px-6 py-4 text-right">
							<div class="flex items-center justify-end gap-2">
								<button
									onclick={() => openDetails(list)}
									class="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-white/20 hover:text-white active:scale-90"
									title="View/Edit Details"
								>
									<Settings class="h-4 w-4" />
								</button>
								<form method="POST" action="?/deleteRelease" use:enhance>
									<input type="hidden" name="id" value={list.id} />
									<button
										class="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 transition-all hover:border-red-500/30 hover:text-red-500 active:scale-90"
										title="Delete List"
									>
										<Trash2 class="h-4 w-4" />
									</button>
								</form>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-6 py-20">
							<div class="flex flex-col items-center justify-center text-center">
								<div
									class="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10"
								>
									<UploadCloud class="w-6 h-6 text-gray-600" />
								</div>
								<h3 class="text-sm font-semibold text-gray-300">No release uploaded yet.</h3>
								<p class="text-xs text-gray-500 mt-1 mb-6">
									Start by deploying the first site list package to BunnyCDN.
								</p>
								<button
									onclick={openUploadModal}
									class="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-lg text-xs font-bold transition-all"
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
{#if isUploadModalOpen}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-md animate-in overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl duration-200 zoom-in-95"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
		>
			<form
				method="POST"
				action="?/uploadRelease"
				enctype="multipart/form-data"
				use:enhance={handleDeploy}
			>
				<input
					type="hidden"
					name="requiresProSubscription"
					value={uploadFormState.requiresProSubscription.toString()}
				/>

				<div class="flex items-center justify-between border-b border-white/5 px-6 py-5">
					<div>
						<h3 class="flex items-center gap-2 text-lg font-bold text-white">
							<UploadCloud class="h-5 w-5 text-amber-500" />
							Deploy New List
						</h3>
						<p class="mt-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
							Package Deployment
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isUploadModalOpen = false)}
						class="text-gray-500 transition-colors hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<div class="space-y-6 p-6">
					{#if form?.error}
						<div
							class="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs font-medium text-red-500"
						>
							{form?.message}
						</div>
					{/if}

					<div class="space-y-1.5">
						<label
							for="upload-name"
							class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase"
							>Name</label
						>
						<input
							id="upload-name"
							name="name"
							bind:value={uploadFormState.name}
							type="text"
							placeholder="e.g., Adult Content List"
							required
							class="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white transition-all outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
						/>
					</div>

					<div class="space-y-2">
						<label
							for="upload-file"
							class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase"
							>Payload File (.zip)</label
						>
						<div class="group relative">
							<input
								id="upload-file"
								type="file"
								name="file"
								class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
								onchange={(e) => (uploadFormState.file = e.currentTarget.files?.[0] || null)}
								required
							/>
							<div
								class="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-white/10 bg-black/20 transition-all group-hover:border-white/20 group-hover:bg-white/5"
							>
								<div class="flex flex-col items-center justify-center p-5 text-center">
									<Upload class="mb-2 h-6 w-6 text-gray-500" />
									{#if uploadFormState.file}
										<p class="max-w-[280px] truncate font-mono text-xs text-amber-500">
											{uploadFormState.file.name}
										</p>
									{:else}
										<p class="text-[10px] font-bold text-gray-500 uppercase">
											Click or drag & drop binary
										</p>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<div
						class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
					>
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-amber-500/10 p-2 text-amber-500">
								<Lock class="h-4 w-4" />
							</div>
							<div>
								<p class="text-xs font-bold text-white">Pro Only</p>
								<p class="mt-0.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
									Subscription Required
								</p>
							</div>
						</div>
						<button
							type="button"
							onclick={() =>
								(uploadFormState.requiresProSubscription =
									!uploadFormState.requiresProSubscription)}
							class="relative h-5 w-10 rounded-full transition-colors {uploadFormState.requiresProSubscription
								? 'bg-amber-500'
								: 'bg-white/10'}"
							aria-label="Toggle Pro Requirement"
						>
							<div
								class="absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-all {uploadFormState.requiresProSubscription
									? 'translate-x-5'
									: ''}"
							></div>
						</button>
					</div>

					<button
						type="submit"
						disabled={isDeploying}
						class="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black shadow-lg shadow-amber-500/10 transition-all hover:bg-amber-400 disabled:opacity-50"
					>
						{#if isDeploying}
							<div
								class="h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-black"
							></div>
							Deploying to CDN...
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
{#if isDetailsModalOpen && selectedRelease}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
		transition:fade={{ duration: 150 }}
	>
		<div
			class="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#111827] shadow-2xl"
			transition:scale={{ duration: 200, start: 0.95 }}
			role="dialog"
		>
			<form method="POST" action="?/updateRelease" use:enhance={handleUpdate}>
				<input type="hidden" name="id" value={selectedRelease.id} />

				<div class="flex items-center justify-between border-b border-white/5 px-6 py-5 text-white">
					<div>
						<h3 class="flex items-center gap-2 text-lg font-bold">
							<Settings class="h-5 w-5 text-amber-500" />
							List Details
						</h3>
						<p class="mt-1 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
							Config Update
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isDetailsModalOpen = false)}
						class="text-gray-500 transition-colors hover:text-white"
					>
						<X class="h-5 w-5" />
					</button>
				</div>

				<div class="space-y-6 p-6">
					<!-- Editable Fields -->
					<div class="space-y-4">
						<div class="space-y-1.5">
							<label
								for="edit-name"
								class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase"
								>Internal Name</label
							>
							<input
								id="edit-name"
								name="name"
								bind:value={selectedRelease.name}
								type="text"
								class="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all outline-none focus:border-amber-500"
							/>
						</div>

						<div
							class="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
						>
							<div class="flex items-center gap-3">
								<div class="rounded-lg bg-amber-500/10 p-2 text-amber-500">
									<Lock class="h-4 w-4" />
								</div>
								<div>
									<p class="text-xs font-bold text-white">Pro Only</p>
									<p class="mt-0.5 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
										Access Control
									</p>
								</div>
							</div>
							<button
								type="button"
								onclick={() =>
									(selectedRelease.requiresProSubscription =
										!selectedRelease.requiresProSubscription)}
								class="relative h-5 w-10 rounded-full transition-colors {selectedRelease.requiresProSubscription
									? 'bg-amber-500'
									: 'bg-white/10'}"
								aria-label="Toggle Pro Requirement"
							>
								<input
									type="checkbox"
									name="requiresProSubscription"
									class="hidden"
									checked={selectedRelease.requiresProSubscription}
								/>
								<div
									class="absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-all {selectedRelease.requiresProSubscription
										? 'translate-x-5'
										: ''}"
								></div>
							</button>
						</div>
					</div>

					<!-- Read Only Technical Data -->
					<div class="space-y-3 border-t border-white/5 pt-4">
						<p class="text-[10px] font-bold tracking-widest text-gray-500 uppercase">
							Technical Assets
						</p>

						<div class="grid grid-cols-2 gap-3">
							<div class="rounded-lg border border-white/10 bg-black/40 p-3">
								<div class="mb-1 flex items-center gap-2">
									<HardDrive class="h-3 w-3 text-gray-500" />
									<span class="text-[10px] font-bold text-gray-500 uppercase">File Size</span>
								</div>
								<p class="font-mono text-xs text-white">{formatBytes(selectedRelease.size)}</p>
							</div>
							<div class="rounded-lg border border-white/10 bg-black/40 p-3">
								<div class="mb-1 flex items-center gap-2">
									<Hash class="h-3 w-3 text-gray-500" />
									<span class="text-[10px] font-bold text-gray-500 uppercase">SHA256</span>
								</div>
								<p class="truncate font-mono text-xs text-white" title={selectedRelease.sha256}>
									{selectedRelease.sha256.substring(0, 12)}...
								</p>
							</div>
						</div>

						<div class="space-y-1.5">
							<label
								for="edit-uuid"
								class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase"
								>Full UUID</label
							>
							<div class="flex gap-2">
								<input
									id="edit-uuid"
									value={selectedRelease.id}
									readonly
									class="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-gray-400 outline-none"
								/>
							</div>
						</div>

						<div class="space-y-1.5">
							<label
								for="edit-cdn"
								class="block text-[10px] font-bold tracking-widest text-gray-500 uppercase"
								>CDN Link</label
							>
							<div class="flex gap-2">
								<input
									id="edit-cdn"
									value={selectedRelease.downloadUrl}
									readonly
									class="flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-xs text-gray-400 outline-none"
								/>
								<a
									href={selectedRelease.downloadUrl}
									target="_blank"
									class="rounded-lg border border-white/10 bg-white/5 p-2 text-gray-400 hover:bg-white/10"
									aria-label="Open CDN link in new tab"
								>
									<ExternalLink class="h-4 w-4" />
								</a>
							</div>
						</div>
					</div>

					<div class="pt-2">
						<button
							type="submit"
							disabled={isUpdating}
							class="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-black transition-all hover:bg-amber-400 disabled:opacity-50"
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

<style>
	:global(body) {
		background-color: #0b0f19;
		color-scheme: dark;
	}
</style>
