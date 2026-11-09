<script lang="ts">
	import { Check, ChevronRight, LockKeyhole } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	const packs = [
		{
			name: m.site_pack_social,
			subtitle: m.site_pack_social_count,
			plan: 'free',
			state: 'downloaded'
		},
		{
			name: m.site_pack_high_risk,
			subtitle: m.site_pack_high_risk_count,
			plan: 'free',
			state: 'downloaded'
		},
		{
			name: m.site_pack_betting,
			subtitle: m.demo_category_starter,
			plan: 'free',
			state: 'available'
		},
		{
			name: m.site_pack_streaming,
			subtitle: m.demo_category_starter,
			plan: 'free',
			state: 'available'
		},
		{
			name: m.site_pack_betting,
			subtitle: m.demo_category_extended,
			plan: 'pro',
			state: 'locked'
		},
		{
			name: m.site_pack_streaming,
			subtitle: m.demo_category_extended,
			plan: 'pro',
			state: 'locked'
		}
	] as const;
</script>

<div class="pack-catalog" aria-label={m.site_pack_visual_label()}>
	{#each packs as pack (pack.plan + pack.name())}
		<div class:locked={pack.state === 'locked'} class="site-pack-row">
			<span class="state-rail" aria-hidden="true"></span>

			<span class="identity">
				<strong>{pack.name()}</strong>
				<span class="metadata">
					<span
						>{pack.plan === 'pro'
							? m.site_pack_plan_pro()
							: m.site_pack_plan_free()}</span
					>
					<span aria-hidden="true">·</span>
					<span class="subtitle">{pack.subtitle()}</span>
				</span>
			</span>

			<span class="fact">
				<span>{m.site_pack_domains_label()}</span>
				<strong>{m.site_pack_domains_curated()}</strong>
			</span>

			<span class="fact">
				<span>{m.site_pack_updated_label()}</span>
				<strong>{m.site_pack_updated_auto()}</strong>
			</span>

			<span class="state">
				{#if pack.state === 'downloaded'}
					<Check size={14} aria-hidden="true" />
					<span>{m.site_pack_state_downloaded()}</span>
				{:else if pack.state === 'locked'}
					<LockKeyhole size={14} aria-hidden="true" />
					<span>{m.site_pack_state_locked()}</span>
				{:else}
					<span>{m.site_pack_state_available()}</span>
				{/if}
			</span>

			<ChevronRight size={16} aria-hidden="true" />
		</div>
	{/each}
</div>

<style>
	.pack-catalog {
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 6px;
		background: var(--card);
	}

	.site-pack-row {
		position: relative;
		min-height: 66px;
		display: grid;
		grid-template-columns:
			6px minmax(140px, 1.5fr) minmax(72px, 0.45fr) minmax(78px, 0.52fr)
			minmax(88px, 0.62fr) auto;
		align-items: center;
		gap: 9px;
		border-bottom: 1px solid var(--border);
		padding-right: 12px;
		background: var(--card);
	}

	.site-pack-row:last-child {
		border-bottom: 0;
	}

	.state-rail {
		align-self: stretch;
		background: var(--ash);
	}

	.site-pack-row.locked .state-rail {
		background: var(--signal);
	}

	.identity {
		min-width: 0;
		display: block;
	}

	.identity > strong {
		display: block;
		overflow: hidden;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 15px;
		font-weight: 600;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.metadata {
		display: flex;
		min-width: 0;
		align-items: center;
		gap: 5px;
		margin-top: 4px;
		color: var(--muted-foreground);
		font-size: 10px;
		line-height: 1.25;
	}

	.subtitle {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.fact {
		min-width: 0;
		display: block;
	}

	.fact > span,
	.fact > strong {
		display: block;
	}

	.fact > span {
		color: var(--muted-foreground);
		font-size: 10px;
	}

	.fact > strong {
		margin-top: 3px;
		overflow: hidden;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		font-weight: 500;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.state {
		min-width: 0;
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 6px;
		color: var(--muted-foreground);
		font-size: 10px;
	}

	.locked .state {
		color: var(--signal-deep);
	}

	@media (max-width: 620px) {
		.site-pack-row {
			grid-template-columns: 6px minmax(0, 1fr) minmax(86px, auto) auto;
		}

		.fact {
			display: none;
		}
	}
</style>
