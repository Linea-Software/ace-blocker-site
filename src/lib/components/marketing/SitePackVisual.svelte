<script lang="ts">
	import * as m from '$lib/paraglide/messages';

	const packs = [
		{ name: m.site_pack_social, count: m.site_pack_social_count, included: true },
		{ name: m.site_pack_high_risk, count: m.site_pack_high_risk_count, included: true },
		{ name: m.site_pack_betting, count: m.site_pack_betting_count, included: true },
		{ name: m.site_pack_streaming, count: m.site_pack_streaming_count, included: false }
	];
</script>

<div
	class="overflow-hidden rounded-lg border border-border bg-card"
	aria-label={m.site_pack_visual_label()}
>
	<div
		class="grid grid-cols-[1fr_auto] border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground"
	>
		<span>{m.site_pack_catalog()}</span>
		<span>{m.site_pack_scope()}</span>
	</div>
	<div class="divide-y divide-border">
		{#each packs as pack, index (index)}
			<div class="grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
				<div class="min-w-0">
					<div class="flex items-center gap-2">
						<span
							class={[
								'h-4 w-1.5 shrink-0',
								pack.included
									? 'bg-foreground'
									: 'border border-foreground/35 bg-transparent'
							]}
							aria-hidden="true"
						></span>
						<p class="truncate font-medium">{pack.name()}</p>
					</div>
					<p class="mt-1 pl-3.5 font-mono text-[10px] text-muted-foreground">
						{pack.count()}
					</p>
				</div>
				<span
					class={[
						'text-xs font-medium',
						pack.included ? 'text-foreground' : 'text-muted-foreground'
					]}
				>
					{pack.included ? m.site_pack_included() : m.site_pack_optional()}
				</span>
			</div>
		{/each}
	</div>
</div>
