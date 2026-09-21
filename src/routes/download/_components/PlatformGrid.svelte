<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';

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

<div class="overflow-hidden rounded-lg border border-border bg-card">
	<div class="border-b border-border bg-muted px-5 py-3 sm:px-6">
		<p class="text-sm font-medium">{m.download_other_arch_title()}</p>
	</div>
	<div class="divide-y divide-border">
		{#each platforms as option (option.id)}
			{@const isRecommended = detectedArch === option.routeArch && option.isAvailable}
			{@const PlatformIcon = option.icon}
			{#if option.isAvailable}
				<a
					href={resolve('/download/[arch]', { arch: option.routeArch })}
					class={[
						'grid min-h-24 gap-4 px-5 py-5 hover:bg-accent sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-6',
						isRecommended &&
							'border-l-4 border-information bg-information/5 pl-4 sm:pl-5'
					]}
				>
					<div
						class="flex size-11 items-center justify-center rounded-md border border-border bg-background"
					>
						<PlatformIcon size={24} stroke={1.5} aria-hidden="true" />
					</div>
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
							<h3 class="font-display text-xl font-semibold">{option.name}</h3>
							{#if isRecommended}
								<span class="text-xs font-medium text-information"
									>{m.download_detected()}</span
								>
							{/if}
						</div>
						<p class="mt-1 text-sm text-muted-foreground">{option.details}</p>
						{#if option.version}
							<p class="mt-2 font-mono text-[11px] text-muted-foreground">
								v{option.version}
							</p>
						{/if}
					</div>
					<div
						class="flex items-center gap-3 text-xs text-muted-foreground sm:justify-end"
					>
						<span class="font-mono">{option.size}</span>
						<span class="rounded-sm border border-border bg-muted px-2 py-1 font-mono"
							>{option.ext}</span
						>
					</div>
				</a>
			{:else}
				<div
					class="grid min-h-24 gap-4 px-5 py-5 opacity-55 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-6"
				>
					<div
						class="flex size-11 items-center justify-center rounded-md border border-border bg-muted"
					>
						<PlatformIcon size={24} stroke={1.5} aria-hidden="true" />
					</div>
					<div>
						<h3 class="font-display text-xl font-semibold">{option.name}</h3>
						<p class="mt-1 text-sm text-muted-foreground">{option.details}</p>
					</div>
					<p class="text-xs text-muted-foreground">{m.download_not_available()}</p>
				</div>
			{/if}
		{/each}
	</div>
</div>
