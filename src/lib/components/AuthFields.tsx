import type { JSX } from '@solidjs/web';
import { AlertCircle } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';

export const inputClass =
	'flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50';
export const primaryButtonClass =
	'inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50';
export const secondaryButtonClass =
	'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-50';
export function AuthLabel(props: { for: string; children: JSX.Element; class?: string }) {
	return (
		<label for={props.for} class={'block text-sm font-medium ' + (props.class ?? '')}>
			{props.children}
		</label>
	);
}
export function AuthAlert(props: { message: string; title?: string }) {
	return (
		<div
			role="alert"
			class="mb-6 flex items-start gap-3 rounded-md border border-danger/40 bg-danger/10 p-4 text-foreground"
		>
			<AlertCircle class="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
			<div class="text-sm">
				<p class="font-medium">{props.title ?? m.auth_error_generic()}</p>
				<p class="mt-1">{props.message}</p>
			</div>
		</div>
	);
}
