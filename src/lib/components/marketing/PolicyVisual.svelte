<script lang="ts">
	import {
		Eye,
		Layers3,
		ListTree,
		Lock,
		LockKeyhole,
		MessageSquare,
		Trash2
	} from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	const days = [
		m.week_mon_short,
		m.week_tue_short,
		m.week_wed_short,
		m.week_thu_short,
		m.week_fri_short,
		m.week_sat_short,
		m.week_sun_short
	];
</script>

<article class="network-policy" aria-label={m.policy_visual_label()}>
	<span class="state-rail" aria-hidden="true"></span>

	<div class="policy-body">
		<section class="lock-seal" aria-label={m.policy_lock_title()}>
			<span class="seal-rail" aria-hidden="true"></span>
			<span class="seal-mark" aria-hidden="true">
				<LockKeyhole size={16} strokeWidth={2} />
			</span>
			<span class="seal-copy">
				<strong>{m.policy_lock_title()}</strong>
				<span>{m.policy_lock_description()}</span>
			</span>
			<span class="seal-detail">{m.policy_lock_until()}</span>
		</section>

		<div class="policy-header">
			<div class="identity">
				<div class="state-line">
					<span class="state-word">{m.policy_state_active()}</span>
					<span class="state-rule" aria-hidden="true"></span>
				</div>

				<div class="object-identity">
					<span class="policy-icon" aria-hidden="true">
						<MessageSquare size={21} strokeWidth={1.8} />
					</span>
					<div class="object-copy">
						<h3>{m.policy_name()}</h3>
						<p class="schedule-copy">{'24/7'}</p>
					</div>
				</div>
			</div>

			<div class="actions" aria-hidden="true">
				<span><Eye size={14} />{m.policy_view()}</span>
				<span><Lock size={14} />{m.policy_review_lock()}</span>
				<span class="disabled"><Trash2 size={14} />{m.policy_delete()}</span>
			</div>
		</div>

		<div class="policy-grid">
			<div class="schedule-zone">
				<div class="scale" aria-hidden="true">
					<span>00</span>
					<span>06</span>
					<span>12</span>
					<span>18</span>
					<span>24</span>
				</div>
				<div class="rows" aria-hidden="true">
					{#each days as day, index (index)}
						<div class="day-row">
							<span class="day">{day()}</span>
							<span class="track">
								{#if index < 7}
									<span class="window"></span>
								{/if}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<dl class="policy-facts">
				<div>
					<dt><Layers3 size={14} aria-hidden="true" /> {m.policy_site_packs()}</dt>
					<dd>1</dd>
				</div>
				<div>
					<dt><ListTree size={14} aria-hidden="true" /> {m.policy_rules()}</dt>
					<dd>0</dd>
				</div>
			</dl>
		</div>
	</div>
</article>

<style>
	.network-policy {
		display: grid;
		grid-template-columns: 7px minmax(0, 1fr);
		overflow: hidden;
		border: 1px solid var(--signal-deep);
		border-radius: 7px;
		background: var(--card);
		box-shadow:
			inset 0 2px 0 color-mix(in srgb, var(--signal) 20%, transparent),
			inset 0 -2px 0 color-mix(in srgb, var(--signal) 20%, transparent);
	}

	.state-rail {
		background: var(--signal);
	}

	.policy-body {
		min-width: 0;
	}

	.lock-seal {
		display: grid;
		grid-template-columns: 5px 28px minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		min-height: 38px;
		border-bottom: 1px solid var(--signal-deep);
		background: color-mix(in srgb, var(--signal) 8%, var(--card));
	}

	.seal-rail {
		align-self: stretch;
		background: var(--signal);
	}

	.seal-mark {
		width: 26px;
		height: 26px;
		display: grid;
		place-items: center;
		color: var(--signal-deep);
	}

	.seal-copy {
		min-width: 0;
		display: block;
		padding-block: 6px;
	}

	.seal-copy strong {
		display: block;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 12px;
		font-weight: 600;
		line-height: 1.1;
	}

	.seal-copy > span {
		display: block;
		margin-top: 1px;
		color: var(--muted-foreground);
		font-size: 11px;
		line-height: 1.35;
	}

	.seal-detail {
		margin-right: 12px;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		white-space: nowrap;
	}

	.policy-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 15px 16px 12px;
	}

	.identity {
		min-width: 0;
		flex: 1;
	}

	.state-line {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 4px;
	}

	.state-word {
		color: var(--signal-deep);
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: 12px;
		font-weight: 600;
	}

	.state-rule {
		width: 26px;
		height: 1px;
		background: var(--signal-deep);
	}

	.object-identity {
		display: flex;
		min-width: 0;
		align-items: flex-start;
		gap: 9px;
	}

	.policy-icon {
		width: 21px;
		height: 21px;
		flex: 0 0 21px;
		display: grid;
		place-items: center;
		margin-top: 1px;
		color: color-mix(in srgb, var(--foreground) 76%, var(--muted-foreground));
	}

	.object-copy {
		min-width: 0;
	}

	h3 {
		margin: 0;
		overflow: hidden;
		font-family: 'IBM Plex Sans Condensed', sans-serif;
		font-size: clamp(19px, 3vw, 23px);
		font-weight: 600;
		line-height: 1.05;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.schedule-copy {
		margin: 5px 0 0;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 11px;
		line-height: 1.35;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: 2px;
	}

	.actions span {
		display: inline-flex;
		min-height: 32px;
		align-items: center;
		gap: 5px;
		padding: 0 7px;
		color: var(--muted-foreground);
		font-size: 11px;
		font-weight: 500;
	}

	.actions .disabled {
		opacity: 0.35;
	}

	.policy-grid {
		display: grid;
		grid-template-columns: minmax(230px, 1fr) auto;
		align-items: end;
		gap: 18px;
		padding: 0 16px 15px;
	}

	.schedule-zone {
		min-width: 0;
		padding-top: 11px;
		border-top: 1px solid var(--border);
	}

	.scale {
		margin-left: 31px;
		display: flex;
		justify-content: space-between;
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		line-height: 1;
	}

	.rows {
		display: grid;
		gap: 4px;
		margin-top: 5px;
	}

	.day-row {
		display: grid;
		grid-template-columns: 26px minmax(0, 1fr);
		align-items: center;
		gap: 5px;
	}

	.day {
		color: var(--muted-foreground);
		font-family: 'IBM Plex Mono', monospace;
		font-size: 10px;
		font-weight: 500;
	}

	.track {
		position: relative;
		height: 7px;
		overflow: hidden;
		border-radius: 2px;
		background: var(--muted);
	}

	.track::before,
	.track::after {
		content: '';
		position: absolute;
		inset-block: 0;
		width: 1px;
		background: color-mix(in srgb, var(--foreground) 12%, transparent);
	}

	.track::before {
		left: 50%;
	}

	.track::after {
		left: 75%;
	}

	.window {
		position: absolute;
		inset-block: 0;
		left: 0;
		width: 100%;
		background: var(--signal);
	}

	.policy-facts {
		display: grid;
		grid-template-columns: repeat(2, minmax(78px, auto));
		margin: 0;
		overflow: hidden;
		border: 1px solid var(--border);
		border-radius: 4px;
	}

	.policy-facts > div {
		min-width: 82px;
		padding: 7px 9px;
		background: color-mix(in srgb, var(--muted) 45%, transparent);
	}

	.policy-facts > div + div {
		border-left: 1px solid var(--border);
	}

	dt {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--muted-foreground);
		font-size: 10px;
	}

	dd {
		margin: 2px 0 0 19px;
		font-family: 'IBM Plex Mono', monospace;
		font-size: 13px;
		font-weight: 500;
	}

	@media (max-width: 620px) {
		.lock-seal {
			grid-template-columns: 5px 28px minmax(0, 1fr);
		}

		.seal-detail {
			grid-column: 3;
			margin: -3px 0 8px;
			white-space: normal;
		}

		.policy-header {
			flex-direction: column;
			gap: 8px;
		}

		.actions {
			display: none;
		}

		.policy-grid {
			grid-template-columns: 1fr;
		}

		.policy-facts {
			justify-self: stretch;
		}
	}
</style>
