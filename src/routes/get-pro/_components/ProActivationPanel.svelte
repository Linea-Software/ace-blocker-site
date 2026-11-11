<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { resolve } from '$app/paths';
	import { localizeHref } from '$lib/paraglide/runtime';
	import {
		ArrowUpRight,
		Check,
		CircleAlert,
		Download,
		KeyRound,
		Loader2,
		MonitorCheck,
		RefreshCw
	} from '@lucide/svelte';

	type ActivationStatus = 'idle' | 'loading' | 'pending' | 'error';
	let { status, onactivate }: { status: ActivationStatus; onactivate: () => void } = $props();
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-start">
	<div class="min-w-0">
		<div
			class="inline-flex items-center gap-2 border-l-4 border-success bg-success/10 px-3 py-2 text-sm font-medium text-success"
		>
			<Check class="size-4" aria-hidden="true" />
			{m.pro_activation_web_active()}
		</div>
		<h1
			class="mt-6 max-w-2xl font-display text-5xl leading-[0.98] font-semibold tracking-tight sm:text-6xl"
		>
			{m.pro_activation_title()}
		</h1>
		<p class="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
			{m.pro_activation_description()}
		</p>
		<div class="mt-8 flex flex-wrap gap-3">
			<a
				href={resolve('/connect')}
				class="inline-flex min-h-12 items-center justify-center rounded-md bg-foreground px-5 font-medium text-background hover:opacity-90"
			>
				{m.device_link_title()}
			</a>
			<button
				type="button"
				onclick={onactivate}
				disabled={status === 'loading'}
				class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-accent disabled:opacity-50"
			>
				{#if status === 'loading'}
					<Loader2 class="size-4 animate-spin" aria-hidden="true" />
				{:else if status === 'pending' || status === 'error'}
					<RefreshCw class="size-4" aria-hidden="true" />
				{:else}
					<ArrowUpRight class="size-4" aria-hidden="true" />
				{/if}
				{status === 'pending' || status === 'error'
					? m.pro_activation_retry()
					: m.pro_activation_open()}
			</button>
			<a
				href={resolve('/download')}
				class="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border px-5 font-medium hover:bg-accent"
			>
				<Download class="size-4" aria-hidden="true" />
				{m.checkout_download_button()}
			</a>
		</div>
		<a
			href={resolve(localizeHref('/') as '/')}
			class="mt-6 inline-flex min-h-10 items-center text-sm text-muted-foreground hover:text-foreground hover:underline"
		>
			{m.pro_success_home()}
		</a>
	</div>

	<div class="overflow-hidden rounded-lg border border-border bg-card">
		<div
			class="flex items-center justify-between gap-3 border-b border-border bg-muted/60 px-5 py-4"
		>
			<div class="flex items-center gap-2 font-display text-lg font-semibold">
				<KeyRound class="size-5" aria-hidden="true" />
				{m.pro_activation_steps_title()}
			</div>
			<span class="font-mono text-xs text-muted-foreground">01 / 03</span>
		</div>
		<ol class="divide-y divide-border">
			<li class="flex gap-4 p-5">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded border border-success/40 bg-success/10 text-success"
				>
					<Check class="size-5" aria-hidden="true" />
				</div>
				<div class="min-w-0">
					<p class="font-semibold">{m.pro_activation_step_account()}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{m.pro_activation_step_account_detail()}
					</p>
				</div>
			</li>
			<li class="flex gap-4 p-5">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground"
				>
					{#if status === 'loading'}
						<Loader2 class="size-4 animate-spin" aria-hidden="true" />
					{:else if status === 'error'}
						<CircleAlert class="size-4 text-danger" aria-hidden="true" />
					{:else}
						<ArrowUpRight class="size-4" aria-hidden="true" />
					{/if}
				</div>
				<div class="min-w-0">
					<p class="font-semibold">{m.pro_activation_step_launch()}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{m.pro_activation_step_launch_detail()}
					</p>
				</div>
			</li>
			<li class="flex gap-4 p-5">
				<div
					class="flex size-9 shrink-0 items-center justify-center rounded border border-border bg-background text-muted-foreground"
				>
					<MonitorCheck class="size-4" aria-hidden="true" />
				</div>
				<div class="min-w-0">
					<p class="font-semibold">{m.pro_activation_step_verify()}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">
						{m.pro_activation_step_verify_detail()}
					</p>
				</div>
			</li>
		</ol>
		<div
			class={[
				'border-t border-border px-5 py-4 text-sm',
				status === 'error'
					? 'bg-danger/10'
					: status === 'pending'
						? 'bg-information/10'
						: 'bg-muted/40'
			]}
			role="status"
			aria-live="polite"
		>
			<p class="font-semibold">
				{#if status === 'error'}{m.pro_activation_status_error()}
				{:else if status === 'pending'}{m.pro_activation_status_pending()}
				{:else if status === 'loading'}{m.pro_activation_status_loading()}
				{:else}{m.pro_activation_status_idle()}{/if}
			</p>
			<p class="mt-1 leading-relaxed text-muted-foreground">
				{status === 'error'
					? m.pro_activation_error_detail()
					: m.pro_activation_pending_detail()}
			</p>
		</div>
	</div>
</div>
