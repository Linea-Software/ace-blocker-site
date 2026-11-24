import { createSignal, onCleanup, Show } from 'solid-js';
import { Clipboard, ClipboardCheck, ShieldCheck } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';

export default function ChecksumCard(props: { hash: string }) {
	const [copied, setCopied] = createSignal(false);
	let reset: number | undefined;
	onCleanup(() => {
		if (reset !== undefined) window.clearTimeout(reset);
	});
	async function copyHash() {
		try {
			await navigator.clipboard.writeText(props.hash);
			setCopied(true);
			if (reset !== undefined) window.clearTimeout(reset);
			reset = window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	}
	return (
		<details class="group overflow-hidden rounded-lg border border-border bg-card">
			<summary class="flex min-h-14 cursor-pointer list-none items-center gap-3 px-5 font-medium hover:bg-accent sm:px-6">
				<ShieldCheck class="size-4 text-information" aria-hidden="true" />
				<span>{m.download_verify_integrity()}</span>
				<span class="ml-auto font-mono text-[11px] text-muted-foreground">SHA-256</span>
			</summary>
			<div class="border-t border-border px-5 py-5 sm:px-6">
				<div class="flex items-start gap-3 rounded-md border border-border bg-muted p-3">
					<code class="min-w-0 flex-1 font-mono text-xs leading-relaxed break-all">
						{props.hash}
					</code>
					<button
						type="button"
						onClick={copyHash}
						class="inline-flex size-10 shrink-0 items-center justify-center rounded-md border border-border bg-card hover:bg-accent"
						aria-label={copied() ? m.download_hash_copied() : m.download_copy_hash()}
					>
						<Show
							when={copied()}
							fallback={<Clipboard class="size-4" aria-hidden="true" />}
						>
							<ClipboardCheck class="size-4 text-success" aria-hidden="true" />
						</Show>
					</button>
				</div>
				<p class="mt-2 min-h-5 text-xs text-success" aria-live="polite">
					{copied() ? m.download_hash_copied() : ''}
				</p>
			</div>
		</details>
	);
}
