<script lang="ts">
	import { LockKeyhole, ShieldCheck, Undo2 } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let { interactive = false } = $props<{ interactive?: boolean }>();
	let attempted = $state(false);

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

<div
	class="overflow-hidden rounded-lg border border-foreground/20 bg-card"
	aria-label={m.policy_visual_label()}
>
	<div class="grid grid-cols-[6px_1fr]">
		<div class="bg-signal" aria-hidden="true"></div>
		<div>
			<div
				class="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5"
			>
				<div>
					<p class="font-display text-lg leading-none font-semibold">{m.policy_name()}</p>
					<p class="mt-1 text-xs text-muted-foreground">{m.policy_type()}</p>
				</div>
				<div class="flex items-center gap-2 text-sm font-medium">
					<span class="h-2 w-2 rounded-full bg-success" aria-hidden="true"></span>
					{m.policy_state_active()}
				</div>
			</div>

			<dl class="grid border-b border-border sm:grid-cols-2">
				<div class="border-b border-border px-4 py-4 sm:border-r sm:border-b-0 sm:px-5">
					<dt class="text-xs text-muted-foreground">{m.policy_target_label()}</dt>
					<dd class="mt-1 font-medium">{m.policy_target_value()}</dd>
				</div>
				<div class="px-4 py-4 sm:px-5">
					<dt class="text-xs text-muted-foreground">{m.policy_resistance_label()}</dt>
					<dd class="mt-1 flex items-center gap-2 font-medium">
						<span class="h-2.5 w-8 bg-signal" aria-hidden="true"></span>
						{m.resistance_high()}
					</dd>
				</div>
			</dl>

			<div class="border-b border-border px-4 py-4 sm:px-5">
				<div class="mb-3 flex items-center justify-between gap-4">
					<p class="text-xs text-muted-foreground">{m.policy_schedule_label()}</p>
					<p class="font-mono text-xs">{m.policy_schedule_time()}</p>
				</div>
				<div class="grid grid-cols-7 gap-1" aria-label={m.policy_schedule_summary()}>
					{#each days as day, index (index)}
						<div class="min-w-0">
							<div
								class={[
									'h-2 border border-foreground/15',
									index < 5 ? 'bg-foreground' : 'bg-muted'
								]}
								aria-hidden="true"
							></div>
							<p class="mt-1 text-center font-mono text-[10px] text-muted-foreground">
								{day()}
							</p>
						</div>
					{/each}
				</div>
			</div>

			<div class="bg-muted/70 px-4 py-4 sm:px-5">
				<div class="flex items-start gap-3">
					<div
						class="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border border-signal-deep bg-signal text-ink"
					>
						<LockKeyhole class="size-4" aria-hidden="true" />
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<p class="font-display font-semibold">{m.policy_lock_title()}</p>
							<p class="font-mono text-xs">{m.policy_lock_until()}</p>
						</div>
						<p class="mt-1 text-sm text-muted-foreground">
							{m.policy_lock_description()}
						</p>
					</div>
				</div>

				{#if interactive}
					<div class="mt-4 border-t border-border pt-4">
						<button
							type="button"
							class="inline-flex min-h-11 items-center gap-2 rounded-md border border-foreground/25 bg-card px-3.5 text-sm font-medium hover:bg-accent"
							onclick={() => (attempted = true)}
						>
							<Undo2 class="size-4" aria-hidden="true" />
							{m.policy_attempt_change()}
						</button>
						<div class="mt-3 min-h-10" aria-live="polite">
							{#if attempted}
								<p class="flex items-start gap-2 text-sm font-medium">
									<ShieldCheck
										class="mt-0.5 size-4 shrink-0 text-signal-deep dark:text-signal"
										aria-hidden="true"
									/>
									<span>{m.policy_attempt_denied()}</span>
								</p>
							{/if}
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
