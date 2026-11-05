<script lang="ts">
	import * as m from '$lib/paraglide/messages';
	import { IconBrandWindows, IconBrandApple, IconBrandUbuntu } from '@tabler/icons-svelte';
	import { Check, Copy, Terminal } from '@lucide/svelte';
	import { installerCommand, type InstallerPlatform } from './installer-command';

	let { platforms }: { platforms: { id: InstallerPlatform; architecture: string | null }[] } =
		$props();
	let copiedPlatform = $state<InstallerPlatform | null>(null);

	const rows = $derived(
		platforms.map((platform) => ({
			...platform,
			command: platform.architecture
				? installerCommand(platform.id, platform.architecture)
				: null
		}))
	);

	function platformLabel(platform: InstallerPlatform): string {
		if (platform === 'windows') return m.download_platform_windows();
		if (platform === 'macos') return m.download_platform_macos();
		return m.download_platform_linux();
	}

	async function copyCommand(platform: InstallerPlatform, command: string) {
		try {
			await navigator.clipboard.writeText(command);
			copiedPlatform = platform;
		} catch {
			copiedPlatform = null;
		}
	}
</script>

<section class="border-b border-border py-12 sm:py-16" aria-labelledby="terminal-install-title">
	<div class="ace-shell grid gap-8 lg:grid-cols-[0.6fr_1.4fr] lg:items-start">
		<div>
			<div class="flex items-center gap-2 font-mono text-xs text-muted-foreground">
				<Terminal class="size-4" aria-hidden="true" />
				{m.download_command_label()}
			</div>
			<h2 id="terminal-install-title" class="mt-3 font-display text-3xl font-semibold">
				{m.download_command_title()}
			</h2>
			<p class="mt-3 max-w-md leading-relaxed text-muted-foreground">
				{m.download_command_description()}
			</p>
		</div>
		<div class="overflow-hidden rounded-lg border border-border bg-card">
			{#each rows as row (row.id)}
				<div class="border-b border-border p-5 last:border-b-0 sm:p-6">
					<div class="mb-3 flex items-center justify-between gap-4">
						<div class="flex items-center gap-2 text-sm font-semibold">
							{#if row.id === 'windows'}
								<IconBrandWindows size={19} aria-hidden="true" />
							{:else if row.id === 'macos'}
								<IconBrandApple size={19} aria-hidden="true" />
							{:else}
								<IconBrandUbuntu size={19} aria-hidden="true" />
							{/if}
							<span>{platformLabel(row.id)}</span>
							<span class="font-mono text-xs font-normal text-muted-foreground">
								{row.id === 'windows' ? 'PowerShell' : 'Terminal'}
							</span>
						</div>
						{#if row.command}
							<button
								type="button"
								class="inline-flex min-h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium hover:bg-accent"
								onclick={() => copyCommand(row.id, row.command!)}
								aria-label={m.download_command_copy_for({
									platform: platformLabel(row.id)
								})}
							>
								{#if copiedPlatform === row.id}
									<Check class="size-4" aria-hidden="true" />
									{m.download_command_copied()}
								{:else}
									<Copy class="size-4" aria-hidden="true" />
									{m.download_command_copy()}
								{/if}
							</button>
						{/if}
					</div>
					{#if row.command}
						<pre
							class="overflow-x-auto rounded border border-border bg-background px-4 py-3 text-xs leading-relaxed"><code
								>{row.command}</code
							></pre>
					{:else}
						<p class="text-sm text-muted-foreground">{m.download_not_available()}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</section>
