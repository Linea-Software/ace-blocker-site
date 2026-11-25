import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { cn } from '$lib/utils';
export default function Panel(
	props: JSX.IntrinsicElements['div'] & { variant?: 'default' | 'surface' }
) {
	const local = props;
	const rest = omit(props, 'class', 'variant', 'children');
	return (
		<div
			{...rest}
			class={cn(
				local.variant === 'surface'
					? 'rounded-lg border border-border bg-card p-5'
					: 'rounded-lg border border-border bg-card p-6',
				local.class
			)}
		>
			{local.children}
		</div>
	);
}
