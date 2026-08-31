<script lang="ts">
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Clipboard from '@lucide/svelte/icons/clipboard';
	import ClipboardCheck from '@lucide/svelte/icons/clipboard-check';
	import { IconShieldCheck } from '@tabler/icons-svelte';
	import { fade } from 'svelte/transition';

	let { hash } = $props<{ hash: string }>();

	let showChecksums = $state(false);
	let copied = $state(false);

	async function copyHash() {
		await navigator.clipboard.writeText(hash);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="mx-auto max-w-2xl space-y-16">
	<div class="space-y-4 px-4">
		<button
			onclick={() => (showChecksums = !showChecksums)}
			class="group mx-auto flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<IconShieldCheck
				size={16}
				class="transition-colors group-hover:text-foreground"
			/>
			Verify download integrity
			<span
				class="transition-transform duration-300"
				class:rotate-180={showChecksums}
			>
				<ChevronDown size={14} />
			</span>
		</button>

		{#if showChecksums}
			<div
				transition:fade={{ duration: 200 }}
				class="space-y-3 rounded-xl border border-border bg-card p-6 text-left"
			>
				<p
					class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>
					SHA-256
				</p>
				<div class="flex items-start gap-2 rounded-md bg-muted px-3 py-2">
					<code class="flex-1 font-mono text-xs break-all text-foreground">
						{hash}
					</code>
					<button
						onclick={copyHash}
						class="mt-0.5 shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
						aria-label="Copy hash"
					>
						{#if copied}
							<ClipboardCheck size={14} class="text-green-500" />
						{:else}
							<Clipboard size={14} />
						{/if}
					</button>
				</div>
				{#if copied}
					<p
						class="text-xs text-green-600 dark:text-green-400"
						transition:fade={{ duration: 150 }}
					>
						Copied to clipboard
					</p>
				{/if}
			</div>
		{/if}
	</div>
</div>
