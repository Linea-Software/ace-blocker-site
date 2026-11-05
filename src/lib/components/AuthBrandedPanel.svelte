<script lang="ts">
	import * as m from '$lib/paraglide/messages.js';
	import BrandLogo from '$lib/components/BrandLogo.svelte';
	import { LockKeyhole } from '@lucide/svelte';
	import { resolve } from '$app/paths';
</script>

<aside
	class="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-white/10 bg-ink p-10 text-paper lg:flex xl:p-12"
>
	<a href={resolve('/')} class="relative z-10 inline-flex items-center">
		<BrandLogo variant="dark" alt={m.site_brand_name()} class="h-12 w-auto" />
	</a>

	<div class="relative z-10 max-w-xl">
		<div class="mb-8 h-1 w-16 bg-signal" aria-hidden="true"></div>
		<p class="font-display text-5xl leading-[0.92] font-semibold tracking-tight xl:text-6xl">
			{m.auth_reclaim_focus_title()}
		</p>
		<p class="mt-6 max-w-md text-base leading-relaxed text-paper/60">
			{m.auth_reclaim_focus_subtitle()}
		</p>

		<div class="mt-10 overflow-hidden rounded-md border border-white/15 bg-graphite">
			<div class="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
				<p class="font-display font-semibold">{m.policy_lock_title()}</p>
				<LockKeyhole class="size-4 text-signal" aria-hidden="true" />
			</div>
			<div class="grid grid-cols-2 divide-x divide-white/10">
				<div class="px-4 py-4">
					<p class="text-xs text-paper/45">{m.policy_schedule_label()}</p>
					<p class="mt-1 font-mono text-sm">{m.policy_schedule_time()}</p>
				</div>
				<div class="px-4 py-4">
					<p class="text-xs text-paper/45">{m.policy_lock_title()}</p>
					<p class="mt-1 font-mono text-sm text-signal">{m.policy_lock_until()}</p>
				</div>
			</div>
		</div>
	</div>

	<p class="relative z-10 text-xs text-paper/45">
		&copy; {new Date().getFullYear()}
		{m.footer_rights_suffix()}
	</p>
</aside>
