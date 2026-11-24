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
					? 'rounded-xl border border-slate-200 bg-slate-100 p-5 backdrop-blur-sm dark:border-white/10 dark:bg-white/5'
					: 'rounded-xl border border-border bg-card p-6',
				local.class
			)}
		>
			{local.children}
		</div>
	);
}
