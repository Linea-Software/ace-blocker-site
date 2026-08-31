<script lang="ts">
	import { Sparkles, Layers, Cloud } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';
	import { mode } from 'mode-watcher';

	const isDark = $derived(mode.current === 'dark');
</script>

<!-- Refined Features Section -->
<div class="mx-auto mt-40 max-w-6xl">
	<div class="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
		<div class="space-y-12">
			<div class="space-y-4">
				<h2
					class="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl dark:text-white"
				>
					{m.toolbox_title()}
				</h2>
				<p class="text-lg text-slate-600 dark:text-slate-400">
					{m.toolbox_description()}
				</p>
			</div>

			<div class="grid grid-cols-1 gap-8">
				<!-- Resistance Mode Protocols -->
				<div class="flex gap-5">
					<div
						class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
					>
						<Sparkles class="h-6 w-6 text-brand" />
					</div>
					<div class="space-y-1">
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
							{m.toolbox_resistance_mode_title()}
						</h3>
						<p class="text-slate-600 dark:text-slate-400">
							{m.toolbox_resistance_mode_description()}
						</p>
					</div>
				</div>

				<!-- Premium Blocklists -->
				<div class="flex gap-5">
					<div
						class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
					>
						<Layers class="h-6 w-6 text-brand" />
					</div>
					<div class="space-y-1">
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
							{m.toolbox_blocklists_title()}
						</h3>
						<p class="text-slate-600 dark:text-slate-400">
							{m.toolbox_blocklists_description()}
						</p>
					</div>
				</div>

				<!-- Cloud Backup -->
				<div class="flex gap-5">
					<div
						class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
					>
						<Cloud class="h-6 w-6 text-brand" />
					</div>
					<div class="space-y-1">
						<h3 class="text-lg font-bold text-slate-900 dark:text-slate-200">
							{m.toolbox_cloud_backup_title()}
						</h3>
						<p class="text-slate-600 dark:text-slate-400">
							{m.toolbox_cloud_backup_description()}
						</p>
					</div>
				</div>
			</div>
		</div>

		<!-- App Screenshot -->
		<div class="group relative flex items-center justify-center overflow-hidden">
			<img
				src={isDark
					? 'https://cdn.aceblocker.com/showcase/resistance-mode-sites-section-dark.png'
					: 'https://cdn.aceblocker.com/showcase/resistance-mode-sites-section-light.png'}
				alt="Resistance Scripts feature showing active friction scripts for Instagram, Reddit, TikTok, Twitch and YouTube"
				class="w-full rounded-xl border border-border shadow-sm"
			/>
		</div>
	</div>
</div>
