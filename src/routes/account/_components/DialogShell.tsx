import { createEffect, createUniqueId, onCleanup } from 'solid-js';
import type { JSX } from '@solidjs/web';
import * as m from '$lib/paraglide/messages';
import { X } from '@lucide/solid';

export type Notify = (message: string, kind?: 'success' | 'error' | 'info') => void;
export default function DialogShell(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	description: string;
	children: JSX.Element;
	danger?: boolean;
	class?: string;
}) {
	let dialog!: HTMLDialogElement;
	const id = createUniqueId();
	createEffect(
		() => props.open,
		(open) => {
			if (!dialog) return;
			if (open && !dialog.open) dialog.showModal();
			else if (!open && dialog.open) dialog.close();
		}
	);
	onCleanup(() => {
		if (dialog?.open) dialog.close();
	});
	return (
		<dialog
			ref={(el) => {
				dialog = el;
			}}
			aria-labelledby={id}
			aria-modal="true"
			onCancel={(event) => {
				event.preventDefault();
				props.onOpenChange(false);
			}}
			onClose={() => {
				if (props.open) props.onOpenChange(false);
			}}
			onClick={(event) => {
				if (event.target === dialog) props.onOpenChange(false);
			}}
			class={
				'ace-account-dialog m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-lg border border-border bg-background p-6 text-foreground shadow-lg backdrop:bg-black/75 sm:p-6 ' +
				(props.class ?? '')
			}
		>
			<div class="ace-dialog-heading mb-5 flex items-start justify-between gap-4">
				<div>
					<h2
						id={id}
						class={
							'font-display text-xl font-semibold ' +
							(props.danger ? 'text-destructive' : '')
						}
					>
						{props.title}
					</h2>
					<p class="mt-2 text-sm text-muted-foreground">{props.description}</p>
				</div>
				<button
					type="button"
					aria-label={m.close()}
					class="rounded p-1 text-muted-foreground hover:bg-accent"
					onClick={() => props.onOpenChange(false)}
				>
					<X class="size-4" aria-hidden="true" />
				</button>
			</div>
			{props.children}
		</dialog>
	);
}
