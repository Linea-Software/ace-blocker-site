<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import type { ActionData, SubmitFunction } from './$types';
	import { 
		Eye, 
		EyeOff, 
		Trash2, 
		Upload, 
		X, 
		ShieldAlert, 
		Terminal,
		UploadCloud,
		Calendar,
		Database,
		AlertTriangle
	} from '@lucide/svelte';
	import { fade, scale } from 'svelte/transition';

	let { data, form } = $props<{ data: any; form: ActionData }>();

	let isModalOpen = $state(false);
	let isDeploying = $state(false);
	let itemToDelete = $state<any>(null);
	let isDragging = $state(false);

	let uploadFormState = $state({
		version: '',
		file: null as File | null,
	});

	function openModal() {
		isModalOpen = true;
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
				isModalOpen = false;
				uploadFormState = {
					version: '',
					file: null,
				};
			}
		};
	};

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		const file = e.dataTransfer?.files?.[0];
		if (file) {
			uploadFormState.file = file;
		}
	}
</script>

<svelte:head>
	<title>{m.admin_releases_category_tracking()} | Ace Blocker Admin</title>
</svelte:head>

<div class="min-h-screen bg-[#0B0F19] p-8 font-sans selection:bg-amber-500/30 text-gray-200">
	<!-- Page Header -->
	<header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
		<div>
			<div class="flex items-center gap-3 mb-1">
				<div class="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-500">
					<ShieldAlert class="w-5 h-5" />
				</div>
				<h1 class="text-2xl lg:text-3xl font-bold text-white tracking-tight">{m.admin_releases_category_tracking()}</h1>
			</div>
			<p class="text-sm text-gray-400 max-w-lg leading-relaxed">Manage and deploy application tracking scripts.</p>
		</div>
		
		<div class="flex items-center gap-3">
			<div class="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[10px] font-mono text-gray-500 uppercase tracking-wider">
				<Database class="w-3.5 h-3.5 text-emerald-500" />
				<span>DB Status: <span class="text-emerald-400">Connected</span></span>
			</div>
			<button 
				onclick={openModal}
				class="inline-flex items-center gap-2 bg-amber-500 text-black px-4 py-2 rounded-lg text-sm font-semibold transition-all hover:bg-amber-400 hover:scale-[1.02] active:scale-95 shadow-lg shadow-amber-500/10"
			>
				<Upload class="w-4 h-4" />
				{m.admin_releases_deploy_new()}
			</button>
		</div>
	</header>

	<!-- Downloads Stats -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
		<div class="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
			<p class="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">Total Downloads</p>
			<p class="text-2xl font-mono font-bold text-amber-500">{data.totalDownloads.toLocaleString()}</p>
		</div>
		<div class="bg-white/5 border border-white/10 p-5 rounded-xl backdrop-blur-sm">
			<p class="text-[10px] uppercase font-bold tracking-widest text-gray-500 mb-1">Active Tracking Scripts</p>
			<p class="text-2xl font-mono font-bold text-white">{data.releases.length}</p>
		</div>
	</div>

	<!-- Data Table -->
	<div class="overflow-x-auto border border-white/10 rounded-xl bg-white/[0.02] backdrop-blur-sm">
		<table class="w-full text-left border-collapse">
			<thead>
				<tr class="bg-white/5 border-b border-white/10">
					<th class="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Version</th>
					<th class="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">File Name</th>
					<th class="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-center">Downloads</th>
					<th class="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold">Release Date</th>
					<th class="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400 font-bold text-right">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-white/5">
				{#each data.releases as release, index (release.id)}
					<tr class="hover:bg-white/5 transition-colors group">
						<td class="px-6 py-4">
							<div class="flex items-center gap-2">
								<span class="text-sm font-semibold text-white group-hover:text-amber-500 transition-colors">{release.version}</span>
								{#if index === 0}
									<span class="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Latest</span>
								{/if}
							</div>
						</td>
						<td class="px-6 py-4">
							<code class="text-[10px] text-gray-400 font-mono truncate max-w-[200px]">{release.fileName}</code>
						</td>
						<td class="px-6 py-4 text-center">
							<span class="text-xs font-mono text-gray-300">{release.downloadCount.toLocaleString()}</span>
						</td>
						<td class="px-6 py-4">
							<span class="text-xs text-gray-400 flex items-center gap-1.5">
								<Calendar class="w-3.5 h-3.5 opacity-40" />
								{formatDate(release.createdAt)}
							</span>
						</td>
						<td class="px-6 py-4 text-right">
							<button 
								onclick={() => itemToDelete = release}
								class="p-2 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/30 transition-all active:scale-90"
								title="Delete Record"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="5" class="px-6 py-20 text-center">
							<div class="flex flex-col items-center justify-center">
								<UploadCloud class="w-10 h-10 text-gray-600 mb-3" />
								<p class="text-sm font-medium text-gray-400 mb-4">No releases uploaded yet.</p>
								<button 
									onclick={openModal}
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
{#if isModalOpen}
	<div 
		class="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		transition:fade={{duration: 150}}
	>
		<div 
			class="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
			transition:scale={{duration: 200, start: 0.95}}
			role="dialog"
		>
			<form method="POST" action="?/uploadRelease" enctype="multipart/form-data" use:enhance={handleDeploy}>
				<div class="px-6 py-5 border-b border-white/5 flex justify-between items-center text-white">
					<div>
						<h3 class="text-lg font-bold flex items-center gap-2">
							<Upload class="w-5 h-5 text-amber-500" />
							{m.admin_releases_upload_title()}
						</h3>
						<p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Targeting: <span class="text-amber-500">Tracking</span></p>
					</div>
					<button type="button" onclick={() => isModalOpen = false} class="text-gray-500 hover:text-white transition-colors">
						<X class="w-5 h-5" />
					</button>
				</div>

				<div class="p-6 space-y-6">
					{#if form?.error}
						<div class="p-3 border border-red-500/20 bg-red-500/10 rounded-lg text-xs text-red-500 font-medium">
							{form?.message}
						</div>
					{/if}

					<div class="space-y-1.5">
						<label for="rel-v" class="block text-[10px] uppercase font-bold tracking-widest text-gray-500">{m.admin_releases_modal_version()}</label>
						<input 
							id="rel-v"
							name="version"
							bind:value={uploadFormState.version}
							type="text" 
							placeholder="e.g. v1.5.0"
							required
							class="w-full bg-black/40 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none transition-all"
						/>
					</div>

					<div class="space-y-1.5">
						<label for="rel-f" class="block text-[10px] uppercase font-bold tracking-widest text-gray-500">{m.admin_releases_modal_file()}</label>
						<div class="group relative">
							<input 
								id="rel-f" 
								type="file" 
								name="file" 
								class="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
								onchange={(e) => uploadFormState.file = e.currentTarget.files?.[0] || null} 
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={handleDrop}
								required 
							/>
							<div 
								class="flex h-32 w-full flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all group-hover:bg-white/5 {isDragging ? 'border-amber-500 bg-amber-500/5' : 'border-white/10 bg-black/20 group-hover:border-white/20'}"
							>
								<div class="flex flex-col items-center justify-center p-5 text-center">
									<UploadCloud class="w-6 h-6 {isDragging ? 'text-amber-500' : 'text-gray-500'} mb-2" />
									{#if uploadFormState.file}
										<p class="text-xs font-mono text-amber-500 truncate max-w-[280px]">{uploadFormState.file.name}</p>
									{:else}
										<p class="text-[10px] text-gray-500 uppercase font-bold">{isDragging ? 'Drop file to upload' : 'Click or drag & drop binary'}</p>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<button 
						type="submit"
						disabled={isDeploying}
						class="w-full bg-amber-500 text-black font-bold py-3 rounded-xl hover:bg-amber-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
					>
						{#if isDeploying}
							<div class="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin"></div>
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
			class="bg-[#111827] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
			role="dialog"
		>
			<div class="p-6">
				<div class="flex items-center gap-3 mb-4">
					<div class="p-2 bg-red-500/10 rounded-lg text-red-500">
						<AlertTriangle class="h-6 w-6" />
					</div>
					<h3 class="text-lg font-bold text-white">Confirm Deletion</h3>
				</div>
				<p class="text-sm text-gray-400 leading-relaxed mb-6">
					Are you sure you want to permanently delete the tracking script <span class="text-white font-semibold">{itemToDelete.version}</span> ({itemToDelete.fileName})? 
					This action cannot be undone and will stop this version from being served.
				</p>
				<div class="flex justify-end gap-3 pt-6 border-t border-white/5">
					<button type="button" onclick={() => itemToDelete = null} class="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
					<form method="POST" action="?/deleteRelease" use:enhance={() => {
						return async ({ result, update }) => {
							await update();
							if (result.type === 'success') itemToDelete = null;
						};
					}}>
						<input type="hidden" name="id" value={itemToDelete.id} />
						<button type="submit" class="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 hover:bg-red-500/20 transition-colors">Confirm Delete</button>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	:global(body) {
		background-color: #0b0f19;
		color-scheme: dark;
	}
</style>
