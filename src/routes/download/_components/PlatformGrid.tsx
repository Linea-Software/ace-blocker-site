import { For, Show, type Component } from 'solid-js';
import * as m from '$lib/paraglide/messages.js';

export interface PlatformOption {
	id: string;
	routeArch: string;
	name: string;
	icon: Component<{ size?: number; stroke?: number; 'aria-hidden'?: 'true' | 'false' }>;
	size: string;
	ext: string;
	details: string;
	version?: string | null;
	isAvailable: boolean;
}
export default function PlatformGrid(props: {
	platforms: PlatformOption[];
	detectedArch: string | null;
}) {
	return (
		<div class="overflow-hidden rounded-lg border border-border bg-card">
			<div class="border-b border-border bg-muted px-5 py-3 sm:px-6">
				<p class="text-sm font-medium">{m.download_other_arch_title()}</p>
			</div>
			<div class="divide-y divide-border">
				<For each={props.platforms}>
					{(option) => {
						const Icon = option.icon;
						const recommended = () =>
							props.detectedArch === option.routeArch && option.isAvailable;
						const body = () => (
							<>
								<div
									class={`flex size-11 items-center justify-center rounded-md border border-border ${option.isAvailable ? 'bg-background' : 'bg-muted'}`}
								>
									<Icon size={24} stroke={1.5} aria-hidden="true" />
								</div>
								<div class="min-w-0">
									<div class="flex flex-wrap items-center gap-x-3 gap-y-1">
										<h3 class="font-display text-xl font-semibold">
											{option.name}
										</h3>
										<Show when={recommended()}>
											<span class="text-xs font-medium text-information">
												{m.download_detected()}
											</span>
										</Show>
									</div>
									<p class="mt-1 text-sm text-muted-foreground">
										{option.details}
									</p>
									<Show when={option.isAvailable && option.version}>
										<p class="mt-2 font-mono text-[11px] text-muted-foreground">
											v{option.version}
										</p>
									</Show>
								</div>
								<Show
									when={option.isAvailable}
									fallback={
										<p class="text-xs text-muted-foreground">
											{m.download_not_available()}
										</p>
									}
								>
									<div class="flex items-center gap-3 text-xs text-muted-foreground sm:justify-end">
										<span class="font-mono">{option.size}</span>
										<span class="rounded-sm border border-border bg-muted px-2 py-1 font-mono">
											{option.ext}
										</span>
									</div>
								</Show>
							</>
						);
						return (
							<Show
								when={option.isAvailable}
								fallback={
									<div class="grid min-h-24 gap-4 px-5 py-5 opacity-55 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-6">
										{body()}
									</div>
								}
							>
								<a
									href={`/download/${encodeURIComponent(option.routeArch)}`}
									class={`grid min-h-24 gap-4 px-5 py-5 hover:bg-accent sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:items-center sm:px-6 ${recommended() ? 'border-l-4 border-information bg-information/5 pl-4 sm:pl-5' : ''}`}
								>
									{body()}
								</a>
							</Show>
						);
					}}
				</For>
			</div>
		</div>
	);
}
