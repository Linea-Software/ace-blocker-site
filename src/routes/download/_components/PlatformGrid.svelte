<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	interface PlatformOption {
		id: string;
		routeArch: string;
		name: string;
		icon: any;
		size: string;
		ext: string;
		details: string;
		version?: string | null;
		isAvailable: boolean;
	}

	let {
		platforms,
		detectedArch
	}: {
		platforms: PlatformOption[];
		detectedArch: string | null;
	} = $props();
</script>

<div class="space-y-10">
	<div class="flex items-center gap-4 px-4">
		<div
			class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800"
		></div>
		<span
			class="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase dark:text-slate-500"
			>{m.download_other_arch_title()}</span
		>
		<div
			class="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800"
		></div>
	</div>

	<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
		{#each platforms as option (option.id)}
			{@const isRecommended = detectedArch === option.routeArch && option.isAvailable}
			{@const PlatformIcon = option.icon}
			<div class="group relative" class:opacity-60={!option.isAvailable}>
				<a
					href={option.isAvailable ? `/download/${option.routeArch}` : undefined}
					class="relative flex flex-col items-start gap-5 rounded-2xl p-8 text-left transition-all duration-500
						{option.isAvailable ? 'hover:scale-[1.02] active:scale-[0.98]' : 'cursor-default'}
						{isRecommended
						? 'border-2 border-brand/50 bg-amber-50 shadow-2xl shadow-brand/10 dark:bg-brand/5'
						: 'border border-slate-200 bg-white shadow-sm hover:border-brand/30 hover:bg-amber-50 dark:border-slate-800 dark:bg-slate-900/30 dark:hover:border-brand/30 dark:hover:bg-brand/5 dark:hover:shadow-xl'}"
					aria-disabled={!option.isAvailable}
				>
					{#if isRecommended}
						<div
							class="absolute top-6 right-8 rounded-md bg-brand px-3 py-1 text-[10px] font-black tracking-wider text-black uppercase shadow-lg"
						>
							{m.download_recommended()}
						</div>
					{:else if !option.isAvailable}
						<div
							class="absolute top-6 right-8 rounded-md bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
						>
							{m.download_not_available()}
						</div>
					{/if}

					<div
						class="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 transition-all duration-300 dark:border-slate-800 dark:bg-slate-900/50 {option.isAvailable
							? 'group-hover:border-brand group-hover:bg-brand group-hover:text-white group-hover:shadow-lg group-hover:shadow-brand/30 dark:group-hover:border-brand/50 dark:group-hover:bg-brand/15 dark:group-hover:text-brand'
							: ''}"
					>
						<PlatformIcon size={32} stroke={1.5} />
					</div>

					<div class="space-y-1">
						<h3
							class="text-2xl font-black tracking-tight text-slate-900 dark:text-white"
						>
							{option.name}
						</h3>
						<p class="text-sm font-bold text-slate-500 dark:text-slate-400">
							{option.details}
						</p>
						{#if option.isAvailable && option.version}
							<p class="text-xs text-muted-foreground">
								v{option.version}
							</p>
						{/if}
					</div>

					<div
						class="mt-4 flex w-full items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800"
					>
						<span
							class="text-[10px] font-black tracking-widest text-slate-400 uppercase dark:text-slate-500"
							>{option.isAvailable ? option.size : '—'}</span
						>
						<span
							class="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-black tracking-wider text-slate-500 uppercase dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400"
						>
							{option.ext}
						</span>
					</div>
				</a>
			</div>
		{/each}
	</div>
</div>
