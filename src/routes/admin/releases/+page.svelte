<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
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
		CheckCircle2,
		AlertCircle
	} from '@lucide/svelte';
	import { fade } from 'svelte/transition';

	let { data } = $props();

	// Category configuration
	const hubConfigs = [
		{ id: 'installers', key: 'installers', icon: HardDrive },
		{ id: 'resistance', key: 'resistance', icon: ScrollText },
		{ id: 'tracking', key: 'tracking', icon: ShieldAlert },
		{ id: 'siteLists', key: 'siteLists', icon: List }
	] as const;

	// Initializing local state from server data for interactivity
	let releaseHubs = $state({
		installers: {
			title: m.admin_releases_category_installers(),
			count: data.installers.totalDownloads,
			latest: { 
				version: data.installers.latest?.version || 'v0.0.0', 
				canBeDownloaded: data.installers.latest?.canBeDownloaded ?? false 
			}
		},
		resistance: {
			title: m.admin_releases_category_resistance(),
			count: data.resistance.totalDownloads,
			latest: { 
				version: data.resistance.latest?.version || 'v0.0.0', 
				canBeDownloaded: data.resistance.latest?.canBeDownloaded ?? false 
			}
		},
		tracking: {
			title: m.admin_releases_category_tracking(),
			count: data.tracking.totalDownloads,
			latest: { 
				version: data.tracking.latest?.version || 'v0.0.0', 
				canBeDownloaded: data.tracking.latest?.canBeDownloaded ?? false 
			}
		},
		siteLists: {
			title: m.admin_releases_category_sitelists(),
			count: data.siteLists.totalDownloads,
			latest: { 
				version: data.siteLists.latest?.name || 'Empty', 
				canBeDownloaded: data.siteLists.latest?.canBeDownloaded ?? false 
			}
		}
	});

	let isModalOpen = $state(false);
	let activeCategory = $state<keyof typeof releaseHubs | null>(null);

	// Form State for Modal
	let uploadForm = $state({
		version: '',
		file: null as File | null,
		os: 'windows',
		architecture: 'x64',
		name: '',
		url: '',
		requiresProSubscription: true
	});

	// Mocked Backend Logic (Mutations)
	async function handleUpload() {
		if (!activeCategory) return;
		console.log('--- BUNNY CDN UPLOAD INITIATED ---');
		console.log('Category:', activeCategory);
		console.log('Form State:', $state.snapshot(uploadForm));
		
		// Simulate network delay
		await new Promise(resolve => setTimeout(resolve, 1500));
		
		// Update local state to reflect change (Mock)
		releaseHubs[activeCategory].latest = {
			version: activeCategory === 'siteLists' ? uploadForm.name : uploadForm.version,
			canBeDownloaded: true
		};
		
		isModalOpen = false;
		// Reset form
		uploadForm = {
			version: '',
			file: null,
			os: 'windows',
			architecture: 'x64',
			name: '',
			url: '',
			requiresProSubscription: true
		};
	}

	async function toggleDownloadable(category: keyof typeof releaseHubs) {
		console.log('--- DRIZZLE MUTATION: TOGGLE ---');
		console.log('Toggling status for:', category);
		releaseHubs[category].latest.canBeDownloaded = !releaseHubs[category].latest.canBeDownloaded;
	}

	async function deleteRelease(category: keyof typeof releaseHubs) {
		if (confirm('Permanently delete the latest release? This action cannot be undone.')) {
			console.log('--- DRIZZLE MUTATION: DELETE ---');
			console.log('Deleting entry for:', category);
			releaseHubs[category].latest = { version: 'N/A', canBeDownloaded: false };
		}
	}

	function openModal(category: keyof typeof releaseHubs) {
		activeCategory = category;
		isModalOpen = true;
	}
</script>

<svelte:head>
	<title>{m.admin_releases_title()} | Ace Blocker Admin</title>
</svelte:head>

<div class="min-h-screen bg-[#0B0F19] p-8 font-sans selection:bg-amber-500/30">
	<!-- Page Header -->
	<header class="mb-8 flex justify-between items-end">
		<div>
			<h1 class="text-2xl lg:text-3xl font-bold text-white mb-2 tracking-tight">{m.admin_releases_title()}</h1>
			<p class="text-sm text-gray-400 max-w-lg leading-relaxed">{m.admin_releases_subtitle()}</p>
		</div>
		<div class="hidden lg:flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs font-mono text-gray-500">
			<Terminal class="w-3.5 h-3.5" />
			<span>DB Status: <span class="text-emerald-500">Connected</span></span>
		</div>
	</header>

	<!-- The Release Hubs Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		{#each hubConfigs as config}
			{@const hub = releaseHubs[config.key]}
			<div class="bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col group hover:border-gray-700 transition-all shadow-xl">
				<!-- Card Header -->
				<div class="flex justify-between items-start mb-6">
					<div class="flex items-center gap-4">
						<div class="w-12 h-12 flex items-center justify-center bg-gray-900 border border-gray-800 rounded-xl text-amber-500 group-hover:scale-110 transition-transform">
							<config.icon class="w-6 h-6" />
						</div>
						<div>
							<h2 class="text-lg font-bold text-white leading-tight">{hub.title}</h2>
							<p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">System Module</p>
						</div>
					</div>
					<div class="inline-flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-full px-3 py-1.5 text-xs font-mono text-gray-400">
						<Plus class="w-3 h-3 text-amber-500" />
						{m.admin_releases_total_dls({ count: hub.count })}
					</div>
				</div>

				<!-- Latest Release Status (Inner Well) -->
				<div class="bg-black/40 border border-white/5 rounded-xl p-5 mb-8 relative overflow-hidden">
					<div class="absolute top-0 right-0 p-4 opacity-5">
						<config.icon class="w-16 h-16 text-white" />
					</div>
					
					<div class="flex items-center justify-between mb-4 relative z-10 transition-all">
						<div class="flex items-center gap-2">
							<span class="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">{m.admin_releases_latest_version()}</span>
						</div>
						
						{#if hub.latest.canBeDownloaded}
							<div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
								<CheckCircle2 class="w-3 h-3 text-emerald-500" />
								<span class="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
									{m.admin_releases_status_active()}
								</span>
							</div>
						{:else}
							<div class="flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-500/10 border border-red-500/20">
								<AlertCircle class="w-3 h-3 text-red-500" />
								<span class="text-[10px] font-bold text-red-500 uppercase tracking-tighter">
									{m.admin_releases_status_disabled()}
								</span>
							</div>
						{/if}
					</div>

					<div class="text-3xl font-mono font-black text-white tracking-tighter relative z-10">
						{hub.latest.version}
					</div>
				</div>

				<!-- Action Bar (Footer of Card) -->
				<div class="mt-auto pt-6 border-t border-gray-800 flex items-center gap-3">
					<button 
						onclick={() => openModal(config.key)}
						class="flex-1 inline-flex justify-center items-center gap-2 bg-amber-500 text-black text-sm font-black rounded-lg px-4 py-3 hover:bg-amber-400 transition-all active:scale-[0.97] hover:shadow-[0_0_20px_rgba(245,158,11,0.2)]"
					>
						<Upload class="w-4 h-4" />
						{m.admin_releases_deploy_new()}
					</button>
					
					<button 
						onclick={() => toggleDownloadable(config.key)}
						class="p-3 rounded-lg border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
						title={hub.latest.canBeDownloaded ? "Disable Public Download" : "Enable Public Download"}
						aria-label={hub.latest.canBeDownloaded ? "Disable Public Download" : "Enable Public Download"}
					>
						{#if hub.latest.canBeDownloaded}
							<Eye class="w-5 h-5" />
						{:else}
							<EyeOff class="w-5 h-5" />
						{/if}
					</button>

					<button 
						onclick={() => deleteRelease(config.key)}
						class="p-3 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
						title="Permanently Delete Records"
						aria-label="Permanently Delete Records"
					>
						<Trash2 class="w-5 h-5" />
					</button>

					<a 
						href="/admin/releases/{config.id}" 
						class="text-xs text-gray-500 hover:text-amber-500 ml-auto font-bold transition-colors uppercase tracking-widest px-2"
					>
						{m.admin_releases_view_all()}
					</a>
				</div>
			</div>
		{/each}
	</div>
</div>

<!-- Upload Modal Overlay -->
{#if isModalOpen}
	<div 
		class="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
		transition:fade={{duration: 150}}
	>
		<div 
			class="bg-[#111827] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ring-1 ring-white/5 ease-out duration-300"
			role="dialog"
			aria-labelledby="modal-title"
		>
			<!-- Modal Header -->
			<div class="px-8 py-6 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
				<div>
					<h3 id="modal-title" class="text-xl font-black text-white flex items-center gap-3 tracking-tight">
						<div class="p-2 bg-amber-500 text-black rounded-lg">
							<Upload class="w-5 h-5" />
						</div>
						{m.admin_releases_upload_title()}
					</h3>
					<p class="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1.5 px-0.5">
						Targeting: <span class="text-amber-500">{activeCategory}</span>
					</p>
				</div>
				<button 
					onclick={() => isModalOpen = false} 
					class="text-gray-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full"
					aria-label="Close Modal"
				>
					<X class="w-6 h-6" />
				</button>
			</div>

			<div class="p-8 space-y-6">
				<!-- Version/Name Input -->
				<div class="space-y-2">
					<label for="release-version" class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
						{activeCategory === 'siteLists' ? m.admin_releases_modal_name() : m.admin_releases_modal_version()}
					</label>
				{#if activeCategory === 'siteLists'}
					<input 
						id="release-name"
						bind:value={uploadForm.name}
						type="text" 
						placeholder="List Name"
						class="w-full bg-gray-950/50 border border-gray-700/50 text-white rounded-xl px-4 py-3.5 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-gray-700 font-mono"
					/>
				{:else}
					<input 
						id="release-version"
						bind:value={uploadForm.version}
						type="text" 
						placeholder="e.g. v1.5.0"
						class="w-full bg-gray-950/50 border border-gray-700/50 text-white rounded-xl px-4 py-3.5 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all placeholder:text-gray-700 font-mono"
					/>
				{/if}
				</div>

				<!-- File Upload -->
				<div class="space-y-2">
					<label for="release-file" class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">
						{m.admin_releases_modal_file()}
					</label>
					<div class="relative">
						<input 
							id="release-file"
							type="file" 
							class="absolute inset-0 opacity-0 cursor-pointer z-10"
							onchange={(e) => uploadForm.file = e.currentTarget.files?.[0] || null}
						/>
						<div class="w-full bg-gray-950/50 border-2 border-dashed border-gray-700/50 hover:border-amber-500/50 rounded-xl px-4 py-8 text-center transition-all group">
							<div class="flex flex-col items-center gap-3">
								<div class="p-3 bg-gray-900 border border-gray-800 rounded-full text-gray-600 group-hover:text-amber-500 transition-colors">
									<Plus class="w-6 h-6" />
								</div>
								{#if uploadForm.file}
									<span class="text-amber-500 text-sm font-bold font-mono">{uploadForm.file.name}</span>
								{:else}
									<div class="space-y-1">
										<p class="text-gray-400 text-sm font-bold">Drop Release Artifact</p>
										<p class="text-gray-600 text-[10px] uppercase font-bold tracking-widest">or click to browse</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Conditional Fields for Installers -->
				{#if activeCategory === 'installers'}
					<div class="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">
						<div class="space-y-2">
							<label for="release-os" class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{m.admin_releases_modal_os()}</label>
							<select 
								id="release-os"
								bind:value={uploadForm.os}
								class="w-full bg-gray-950/50 border border-gray-700/50 text-white rounded-xl px-4 py-3.5 focus:border-amber-500 outline-none appearance-none font-bold text-sm"
							>
								<option value="windows">Windows</option>
								<option value="linux">Linux</option>
								<option value="macos">macOS</option>
							</select>
						</div>
						<div class="space-y-2">
							<label for="release-arch" class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{m.admin_releases_modal_arch()}</label>
							<select 
								id="release-arch"
								bind:value={uploadForm.architecture}
								class="w-full bg-gray-950/50 border border-gray-700/50 text-white rounded-xl px-4 py-3.5 focus:border-amber-500 outline-none appearance-none font-bold text-sm"
							>
								<option value="x64">x64</option>
								<option value="arm64">arm64</option>
							</select>
						</div>
					</div>
				{/if}

				<!-- Conditional Fields for Site Lists -->
				{#if activeCategory === 'siteLists'}
					<div class="space-y-6 pt-2 animate-in slide-in-from-top-2 duration-200">
						<div class="space-y-2">
							<label for="release-url" class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">{m.admin_releases_modal_url()}</label>
							<input 
								id="release-url"
								bind:value={uploadForm.url}
								type="text" 
								placeholder="https://..."
								class="w-full bg-gray-950/50 border border-gray-700/50 text-white rounded-xl px-4 py-3.5 focus:border-amber-500 outline-none font-mono text-sm"
							/>
						</div>
						<div class="flex items-center justify-between p-4 bg-gray-950/50 rounded-xl border border-gray-800">
							<div>
								<p class="text-sm font-bold text-white tracking-tight">{m.admin_releases_modal_pro_req()}</p>
								<p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Subscription Protected</p>
							</div>
							<button 
								onclick={() => uploadForm.requiresProSubscription = !uploadForm.requiresProSubscription}
								class="w-12 h-6 rounded-full transition-all relative {uploadForm.requiresProSubscription ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.3)]' : 'bg-gray-800'}"
								aria-label="Toggle Pro Requirement"
							>
								<div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform {uploadForm.requiresProSubscription ? 'translate-x-6' : ''}"></div>
							</button>
						</div>
					</div>
				{/if}

				<!-- Submit Button -->
				<button 
					onclick={handleUpload}
					class="w-full bg-amber-500 text-black font-black py-4 rounded-xl mt-4 hover:bg-amber-400 transition-all active:scale-[0.97] shadow-xl shadow-amber-500/10 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
				>
					<Upload class="w-4 h-4" />
					{m.admin_releases_modal_submit()}
				</button>
			</div>
		</div>
	</div>
{/if}


<style>
	:global(body) {
		background-color: #0B0F19;
		color-scheme: dark;
	}

	/* Custom Hide Scrollbar for cleaner look */
	::-webkit-scrollbar {
		width: 8px;
	}
	::-webkit-scrollbar-track {
		background: #0B0F19;
	}
	::-webkit-scrollbar-thumb {
		background: #1F2937;
		border-radius: 4px;
	}
	::-webkit-scrollbar-thumb:hover {
		background: #374151;
	}
</style>
