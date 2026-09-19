<script lang="ts">
	import { LockKeyhole } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	const rows = [
		{ label: m.schedule_row_morning, start: '06:00', end: '09:00', width: '28%' },
		{ label: m.schedule_row_work, start: '09:00', end: '17:00', width: '72%' },
		{ label: m.schedule_row_evening, start: '20:00', end: '23:00', width: '28%' }
	];
</script>

<div
	class="overflow-hidden rounded-lg border border-border bg-card"
	aria-label={m.schedule_visual_label()}
>
	<div class="flex items-center justify-between gap-4 border-b border-border px-4 py-3">
		<p class="font-display font-semibold">{m.schedule_title()}</p>
		<p class="font-mono text-xs text-muted-foreground">{m.schedule_timezone()}</p>
	</div>
	<div class="divide-y divide-border">
		{#each rows as row, index (index)}
			<div
				class="grid grid-cols-[5.5rem_1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[7rem_1fr_8rem]"
			>
				<div>
					<p class="text-sm font-medium">{row.label()}</p>
					<p class="font-mono text-[10px] text-muted-foreground">{row.start}-{row.end}</p>
				</div>
				<div class="relative h-6 overflow-hidden border border-border bg-muted">
					<div
						class={[
							'absolute inset-y-0 border-r border-foreground/20',
							index === 1 ? 'left-[25%] bg-signal' : 'left-[8%] bg-foreground'
						]}
						style:width={row.width}
						aria-hidden="true"
					></div>
				</div>
				<div class="hidden items-center justify-end gap-1.5 text-xs sm:flex">
					{#if index === 1}
						<LockKeyhole
							class="size-3.5 text-signal-deep dark:text-signal"
							aria-hidden="true"
						/>
						{m.schedule_locked()}
					{:else}
						{m.schedule_enforced()}
					{/if}
				</div>
			</div>
		{/each}
	</div>
</div>
