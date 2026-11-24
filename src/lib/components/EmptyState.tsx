import { Show, type Component } from 'solid-js';
import Button from '$lib/components/ui/button/button';
export default function EmptyState(props: {
	colspan?: number;
	Icon: Component<{ class?: string; 'aria-hidden'?: string }>;
	title: string;
	description?: string;
	actionLabel: string;
	onaction?: () => void;
	circle?: boolean;
}) {
	const Icon = props.Icon;
	return (
		<tr>
			<td colspan={props.colspan ?? 5} class="px-6 py-16 text-center">
				<div class="flex flex-col items-center justify-center">
					<div
						class={
							props.circle
								? 'mb-4 flex size-12 items-center justify-center rounded-full border bg-muted'
								: 'mb-4 flex size-11 items-center justify-center rounded-xl bg-muted'
						}
					>
						<Icon class="size-5 text-muted-foreground" aria-hidden="true" />
					</div>
					<h3 class="text-sm font-semibold">{props.title}</h3>
					<Show when={props.description}>
						<p class="mt-1 max-w-md text-sm text-muted-foreground">
							{props.description}
						</p>
					</Show>
					<Show when={props.onaction}>
						<Button class="mt-5" size="sm" onClick={() => props.onaction?.()}>
							{props.actionLabel}
						</Button>
					</Show>
				</div>
			</td>
		</tr>
	);
}
