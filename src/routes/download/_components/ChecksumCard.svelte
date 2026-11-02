<script lang="ts">
	import Clipboard from '@lucide/svelte/icons/clipboard';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import { ShieldCheck } from '@lucide/svelte';
	import * as m from '$lib/paraglide/messages';

	let { hash }: { hash: string } = $props();
	let copied = $state(false);

	async function copyHash() {
		await navigator.clipboard.writeText(hash);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<details class="group overflow-hidden rounded-lg border border-border bg-card">
	<summary
		class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 font-medium hover:bg-accent sm:px-6"
	>
		<ShieldCheck class="size-4 text-information" aria-hidden="true" />
		<span>{m.download_verify_integrity()}</span>
		<span class="ml-auto font-mono text-[11px] text-muted-foreground">SHA-256</span>
	</summary>
	<div class="border-t border-border px-5 py-5 sm:px-6">
		<div class="flex items-start gap-3 rounded-md border border-border bg-muted p-3">
			<code class="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all">{hash}</code>
			<button
				type="button"
				onclick={copyHash}
				class="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card hover:bg-accent"
				aria-label={copied ? m.download_hash_copied() : m.download_copy_hash()}
			>
				{#if copied}
					<ClipboardCheck class="size-4 text-success" aria-hidden="true" />
				{:else}
					<Clipboard class="size-4" aria-hidden="true" />
				{/if}
			</button>
		</div>
		<p class="mt-2 min-h-5 text-xs text-success" aria-live="polite">
			{copied ? m.download_hash_copied() : ''}
		</p>
	</div>
</details>
