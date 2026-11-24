import { For } from 'solid-js';
import { Check, ChevronRight, LockKeyhole } from '@lucide/solid';
import * as m from '$lib/paraglide/messages';
import styles from './SitePackVisual.module.css';
const cls = (value: string) =>
	value
		.split(/\s+/)
		.map((part) => (styles[part] ? part + ' ' + styles[part] : part))
		.join(' ');

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
	{ name: m.site_pack_betting, subtitle: m.demo_category_extended, plan: 'pro', state: 'locked' },
	{
		name: m.site_pack_streaming,
		subtitle: m.demo_category_extended,
		plan: 'pro',
		state: 'locked'
	}
] as const;

export default function SitePackVisual() {
	return (
		<div class={cls('pack-catalog')} aria-label={m.site_pack_visual_label()}>
			<For each={packs}>
				{(pack) => (
					<div
						class={
							cls('site-pack-row') +
							(pack.state === 'locked' ? ' ' + cls('locked') : '')
						}
					>
						<span class={cls('state-rail')} aria-hidden="true" />
						<span class={cls('identity')}>
							<strong>{pack.name()}</strong>
							<span class={cls('metadata')}>
								<span>
									{pack.plan === 'pro'
										? m.site_pack_plan_pro()
										: m.site_pack_plan_free()}
								</span>
								<span aria-hidden="true">·</span>
								<span class={cls('subtitle')}>{pack.subtitle()}</span>
							</span>
						</span>
						<span class={cls('fact')}>
							<span>{m.site_pack_domains_label()}</span>
							<strong>{m.site_pack_domains_curated()}</strong>
						</span>
						<span class={cls('fact')}>
							<span>{m.site_pack_updated_label()}</span>
							<strong>{m.site_pack_updated_auto()}</strong>
						</span>
						<span class={cls('state')}>
							{pack.state === 'downloaded' ? (
								<>
									<Check size={14} aria-hidden="true" />
									<span>{m.site_pack_state_downloaded()}</span>
								</>
							) : pack.state === 'locked' ? (
								<>
									<LockKeyhole size={14} aria-hidden="true" />
									<span>{m.site_pack_state_locked()}</span>
								</>
							) : (
								<span>{m.site_pack_state_available()}</span>
							)}
						</span>
						<ChevronRight size={16} aria-hidden="true" />
					</div>
				)}
			</For>
		</div>
	);
}
