<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import { enhance } from '$app/forms';
	import type { ActionData, SubmitFunction } from './$types';
	import { 
		Eye, 
		EyeOff, 
		Trash2, 
		Plus, 
		Upload, 
		X, 
		HardDrive, 
		ScrollText, 
		ShieldAlert, 
		List,
		Terminal,
		UploadCloud
	} from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	let { data, form } = $props<{ data: any; form: ActionData }>();

	// Category configuration
	const hubConfigs = [
		{ id: 'installers', key: 'installers', icon: HardDrive },
		{ id: 'resistance', key: 'resistance', icon: ScrollText },
		{ id: 'tracking', key: 'tracking', icon: ShieldAlert },
		{ id: 'siteLists', key: 'siteLists', icon: List }
	] as const;

	function getInitialHubs(d: any) {
		return {
			installers: {
				title: m.admin_releases_category_installers(),
				count: d.installers.totalDownloads,
				latest: d.installers.latest ? { 
					version: d.installers.latest.version, 
					canBeDownloaded: d.installers.latest.canBeDownloaded
				} : null
			},
			resistance: {
				title: m.admin_releases_category_resistance(),
				count: d.resistance.totalDownloads,
				latest: d.resistance.latest ? { 
					version: d.resistance.latest.version, 
					canBeDownloaded: d.resistance.latest.canBeDownloaded
				} : null
			},
			tracking: {
				title: m.admin_releases_category_tracking(),
				count: d.tracking.totalDownloads,
				latest: d.tracking.latest ? { 
					version: d.tracking.latest.version, 
					canBeDownloaded: d.tracking.latest.canBeDownloaded
				} : null
			},
			siteLists: {
				title: m.admin_releases_category_sitelists(),
				count: d.siteLists.totalDownloads,
				latest: d.siteLists.latest ? { 
					version: d.siteLists.latest.name, 
					canBeDownloaded: d.siteLists.latest.canBeDownloaded
				} : null
			}
		};
	}

	let releaseHubs = $state(getInitialHubs(data));

	let isModalOpen = $state(false);
	let activeCategory = $state<string | null>(null);
	let isDeploying = $state(false);

	let uploadFormState = $state({
		id: '',
		version: '',
		file: null as File | null,
		os: 'windows',
		architecture: 'x64',
		name: '',
		requiresProSubscription: true
	});

	function openModal(category: string) {
		activeCategory = category;
		isModalOpen = true;
	}

	function generateUuid() {
		uploadFormState.id = crypto.randomUUID();
	}

	const handleDeploy: SubmitFunction = () => {
		isDeploying = true;
		return async ({ result, update }) => {
			await update();
			isDeploying = false;
			if (result.type === 'success') {
				isModalOpen = false;
				
				// Mock a state update until we reload from DB properly
				if (activeCategory) {
					releaseHubs[activeCategory as keyof typeof releaseHubs].latest = {
						version: activeCategory === 'siteLists' ? uploadFormState.name : uploadFormState.version,
						canBeDownloaded: true
					};
				}

				uploadFormState = {
					id: '',
					version: '',
					file: null,
					os: 'windows',
					architecture: 'x64',
					name: '',
					requiresProSubscription: true
				};
				// Optional: Trigger a toast notification (e.g., using a store or event)
			}
		};
	};
</script>

<svelte:head>
	<title>{m.admin_releases_title()} | Ace Blocker Admin</title>
</svelte:head>

<div class="min-h-screen bg-[#0B0F19] p-8 font-sans selection:bg-amber-500/30">
	<!-- Page Header -->
	<header class="mb-8 flex justify-between items-end border-b border-gray-800 pb-4">
		<div>
			<h1 class="text-2xl lg:text-3xl font-bold text-white mb-2 tracking-tight">{m.admin_releases_title()}</h1>
			<p class="text-sm text-gray-400 max-w-lg leading-relaxed">{m.admin_releases_subtitle()}</p>
		</div>
		<div class="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-gray-500 shadow-sm">
			<Terminal class="w-3.5 h-3.5" />
			<span>DB Status: <span class="text-emerald-500">Connected</span></span>
		</div>
	</header>

	<!-- The Release Hubs Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#each hubConfigs as config}
			{@const hub = releaseHubs[config.key]}
			<div class="bg-[#111827] border border-gray-800 rounded-xl flex flex-col transition-all shadow-md hover:shadow-lg focus-within:ring-1 focus-within:ring-amber-500/50">
				<!-- Card Header -->
				<div class="p-6 border-b border-gray-800/50 flex justify-between items-start bg-gray-900/10 rounded-t-xl">
					<div class="flex items-center gap-4">
						<div class="w-10 h-10 flex items-center justify-center bg-[#0B0F19] border border-gray-800 rounded-lg text-amber-500 shadow-inner">
							<config.icon class="w-5 h-5" />
						</div>
						<div>
							<h2 class="text-lg font-bold text-gray-100 leading-tight tracking-tight">{hub.title}</h2>
							<p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">System Module</p>
						</div>
					</div>
					<div class="inline-flex items-center gap-2 bg-[#0B0F19] border border-gray-800 rounded-md px-2.5 py-1 text-xs font-mono text-gray-400 shadow-sm transition-colors cursor-default hover:border-gray-700">
						<span class="text-amber-500 text-[10px]">▼</span>
						{m.admin_releases_total_dls({ count: hub.count })}
					</div>
				</div>

				<div class="p-6 flex-1 flex flex-col">
					<!-- State Implementation -->
					{#if !hub.latest}
						<!-- Empty State -->
						<div class="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-800 rounded-xl bg-gray-900/30 w-full mb-auto mt-2 transition-colors hover:border-gray-700">
							<UploadCloud class="w-10 h-10 text-gray-600 mb-3" />
							<p class="text-sm font-medium text-gray-400 mb-5 text-center">No release uploaded yet.</p>
							<button 
								onclick={() => openModal(config.key)}
								class="inline-flex items-center gap-2 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 px-4 py-2 rounded-lg text-sm font-bold transition-colors active:scale-95"
							>
								<Upload class="w-4 h-4" />
								Deploy First Build
							</button>
						</div>
					{:else}
						<!-- Populated State -->
						<div class="flex items-center justify-between mb-8 px-1">
							<div class="space-y-1">
								<span class="text-[10px] text-gray-500 font-bold uppercase tracking-[0.1em]">{m.admin_releases_latest_version()}</span>
								<div class="text-xl font-mono font-semibold text-gray-100 tracking-tight flex items-center gap-3">
									{hub.latest.version}
									{#if !hub.latest.canBeDownloaded}
										<span class="text-[10px] px-2 py-0.5 rounded border border-red-500/30 bg-red-500/10 text-red-500 uppercase tracking-tighter">Disabled</span>
									{/if}
								</div>
							</div>
						</div>

						<!-- Action Bar (Footer of Card) -->
						<div class="mt-auto pt-5 border-t border-gray-800/50 flex items-center justify-between">
							<button 
								onclick={() => openModal(config.key)}
								class="inline-flex justify-center items-center gap-2 bg-amber-500 text-[#0B0F19] text-xs font-bold rounded-md px-4 py-2 hover:bg-amber-400 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#111827]"
							>
								<Upload class="w-3.5 h-3.5" />
								{m.admin_releases_deploy_new()}
							</button>
							
							<div class="flex items-center gap-1.5 ml-auto">
								<form method="POST" action="?/toggleDownloadable" use:enhance>
									<input type="hidden" name="category" value={config.key} />
									<button 
										class="p-2 rounded-md bg-transparent border border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors focus:ring-1 focus:ring-gray-600 focus:outline-none"
										title={hub.latest.canBeDownloaded ? "Disable Public Download" : "Enable Public Download"}
										aria-label={hub.latest.canBeDownloaded ? "Disable Public Download" : "Enable Public Download"}
									>
										{#if hub.latest.canBeDownloaded}
											<Eye class="w-4 h-4" />
										{:else}
											<EyeOff class="w-4 h-4" />
										{/if}
									</button>
								</form>

								<form method="POST" action="?/deleteRelease" use:enhance>
									<input type="hidden" name="category" value={config.key} />
									<button 
										class="p-2 rounded-md bg-transparent border border-transparent text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-colors focus:ring-1 focus:ring-red-500 focus:outline-none"
										title="Delete Record"
										aria-label="Delete Record"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</form>
							</div>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Upload Modal Overlay -->
{#if isModalOpen}
	<div 
		class="fixed inset-0 bg-[#0B0F19]/90 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 transition-opacity"
		transition:fade={{duration: 150}}
	>
		<div 
			class="bg-[#111827] border border-gray-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
			role="dialog"
			aria-labelledby="modal-title"
		>
			<form method="POST" action="?/uploadRelease" enctype="multipart/form-data" use:enhance={handleDeploy}>
				<input type="hidden" name="category" value={activeCategory} />
				<input type="hidden" name="requiresProSubscription" value={uploadFormState.requiresProSubscription.toString()} />
				
				<!-- Modal Header -->
				<div class="px-6 py-5 border-b border-gray-800 flex justify-between items-center bg-[#111827]">
					<div>
						<h3 id="modal-title" class="text-lg font-bold text-gray-100 flex items-center gap-2">
							<Upload class="w-4 h-4 text-amber-500" />
							{m.admin_releases_upload_title()}
						</h3>
						<p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">
							Targeting: <span class="text-amber-500">{activeCategory}</span>
						</p>
					</div>
					<button 
						type="button"
						onclick={() => isModalOpen = false} 
						class="text-gray-500 hover:text-white transition-colors p-1 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-700"
						aria-label="Close Modal"
					>
						<X class="w-5 h-5" />
					</button>
				</div>

				<div class="p-6 space-y-5">
					{#if form?.error}
						<div class="p-3 border border-red-500/20 bg-red-500/10 rounded-lg text-sm text-red-500 font-medium">
							{form?.message}
						</div>
					{/if}

					<!-- Version/Name Input -->
					<div class="space-y-1.5">
						<label for="release-version" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
							{activeCategory === 'siteLists' ? m.admin_releases_modal_name() : m.admin_releases_modal_version()}
						</label>
						{#if activeCategory === 'siteLists'}
							<input 
								id="release-name"
								name="version"
								bind:value={uploadFormState.name}
								type="text" 
								placeholder="List Name"
								required
								class="w-full bg-[#0B0F19] border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors placeholder:text-gray-600 font-mono"
							/>
						{:else}
							<input 
								id="release-version"
								name="version"
								bind:value={uploadFormState.version}
								type="text" 
								placeholder="e.g. v1.5.0"
								required
								class="w-full bg-[#0B0F19] border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors placeholder:text-gray-600 font-mono"
							/>
						{/if}
					</div>

					<!-- File Upload -->
					<div class="space-y-1.5">
						<label for="release-file" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
							{m.admin_releases_modal_file()}
						</label>
						<div class="relative">
							<input 
								id="release-file"
								name="file"
								type="file" 
								required
								class="absolute inset-0 opacity-0 cursor-pointer z-10"
								onchange={(e) => uploadFormState.file = e.currentTarget.files?.[0] || null}
							/>
							<div class="w-full bg-[#0B0F19] border border-dashed border-gray-700 hover:border-gray-500 rounded-lg px-4 py-6 text-center transition-colors">
								<div class="flex flex-col items-center gap-2">
									<UploadCloud class="w-5 h-5 text-gray-500" />
									{#if uploadFormState.file}
										<span class="text-amber-500 text-sm font-semibold font-mono truncate max-w-full">{uploadFormState.file.name}</span>
									{:else}
										<div class="space-y-0.5">
											<p class="text-gray-300 text-sm font-medium">Select binary payload</p>
											<p class="text-gray-600 text-[10px] uppercase font-bold tracking-wider">or drag & drop</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>

					<!-- Conditional Fields for Installers -->
					{#if activeCategory === 'installers'}
						<div class="grid grid-cols-2 gap-4 animate-in fade-in duration-200">
							<div class="space-y-1.5">
								<label for="release-os" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{m.admin_releases_modal_os()}</label>
								<select 
									id="release-os"
									name="os"
									bind:value={uploadFormState.os}
									class="w-full bg-[#0B0F19] border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none font-medium"
								>
									<option value="windows">Windows</option>
									<option value="linux">Linux</option>
									<option value="macos">macOS</option>
								</select>
							</div>
							<div class="space-y-1.5">
								<label for="release-arch" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">{m.admin_releases_modal_arch()}</label>
								<select 
									id="release-arch"
									name="architecture"
									bind:value={uploadFormState.architecture}
									class="w-full bg-[#0B0F19] border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-amber-500 outline-none font-medium"
								>
									<option value="x64">x64</option>
									<option value="arm64">arm64</option>
								</select>
							</div>
						</div>
					{/if}

					<!-- Conditional Fields for Site Lists -->
					{#if activeCategory === 'siteLists'}
						<div class="space-y-5 animate-in fade-in duration-200">
							<div class="space-y-1.5">
								<div class="flex items-center justify-between">
									<label for="release-id" class="block text-xs font-semibold text-gray-400 uppercase tracking-wider">Site List ID (UUID)</label>
									<button 
										type="button" 
										onclick={generateUuid} 
										class="p-1 hover:bg-gray-800 rounded bg-transparent text-gray-500 hover:text-amber-500 transition-colors focus:outline-none"
										title="Generate new UUID"
									>
										<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
									</button>
								</div>
								<input 
									id="release-id"
									name="id"
									bind:value={uploadFormState.id}
									type="text" 
									placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
									required
									class="w-full bg-transparent border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-colors font-mono placeholder:text-gray-600"
								/>
							</div>
							<div class="flex items-center justify-between p-3 bg-gray-900 rounded-lg border border-gray-800">
								<div>
									<p class="text-sm font-semibold text-gray-200">{m.admin_releases_modal_pro_req()}</p>
									<p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Subscription Protected</p>
								</div>
								<button 
									type="button"
									onclick={() => uploadFormState.requiresProSubscription = !uploadFormState.requiresProSubscription!}
									class="w-10 h-5 rounded-full transition-colors relative {uploadFormState.requiresProSubscription ? 'bg-amber-500' : 'bg-gray-700'}"
									aria-label="Toggle Pro Requirement"
								>
									<div class="absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform {uploadFormState.requiresProSubscription ? 'translate-x-5' : ''}"></div>
								</button>
							</div>
						</div>
					{/if}

					<!-- Submit Button -->
					<div class="pt-2">
						<button 
							type="submit"
							disabled={isDeploying}
							class="w-full bg-amber-500 text-[#0B0F19] font-bold py-2.5 rounded-lg hover:bg-amber-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-[#111827]"
						>
							{#if isDeploying}
								<span class="w-4 h-4 border-2 border-[#0B0F19]/30 border-t-[#0B0F19] rounded-full animate-spin"></span>
								Deploying...
							{:else}
								{m.admin_releases_modal_submit()}
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
		background-color: #0B0F19;
		color-scheme: dark;
	}
</style>
