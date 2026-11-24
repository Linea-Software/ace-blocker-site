import type { JSX } from '@solidjs/web';
export default function MetricCard(props: {
	label: string;
	value: string;
	detail: string;
	Icon: (props: { class?: string }) => JSX.Element;
}) {
	return (
		<div class="rounded-lg border border-border bg-card p-5">
			<div class="flex items-center justify-between">
				<p class="text-sm font-medium text-muted-foreground">{props.label}</p>
				<span class="rounded-lg bg-muted p-2">
					<props.Icon class="size-4" />
				</span>
			</div>
			<p class="mt-3 font-display text-3xl font-semibold">{props.value}</p>
			<p class="mt-2 text-xs text-muted-foreground">{props.detail}</p>
		</div>
	);
}
