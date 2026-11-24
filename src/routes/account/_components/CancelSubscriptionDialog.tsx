import { createEffect, createSignal, onCleanup, Show } from 'solid-js';
import { Loader2 } from '@lucide/solid';
import * as m from '$lib/paraglide/messages.js';
import DialogShell, { type Notify } from './DialogShell';

export default function CancelSubscriptionDialog(props: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	notify: Notify;
	onChanged: () => void;
}) {
	const [loading, setLoading] = createSignal(false);
	const [countdown, setCountdown] = createSignal(0);
	let countdownTimer: ReturnType<typeof setInterval> | undefined;
	function stopCountdown() {
		if (countdownTimer) clearInterval(countdownTimer);
		countdownTimer = undefined;
		setCountdown(0);
	}
	createEffect(
		() => props.open,
		(open) => {
			if (!open) {
				stopCountdown();
				return;
			}
			stopCountdown();
			setCountdown(5);
			countdownTimer = setInterval(() => {
				setCountdown((value) => {
					if (value <= 1) {
						stopCountdown();
						return 0;
					}
					return value - 1;
				});
			}, 1000);
		}
	);
	onCleanup(stopCountdown);
	async function handleCancel() {
		if (loading() || countdown() > 0) return;
		setLoading(true);
		try {
			const res = await fetch('/api/v1/account/cancel-subscription', {
				method: 'POST',
				credentials: 'include'
			});
			if (!res.ok) throw new Error('Subscription cancellation rejected');
			props.notify(m.account_cancel_success(), 'success');
			props.onOpenChange(false);
			props.onChanged();
		} catch {
			props.notify(m.account_cancel_error(), 'error');
		} finally {
			setLoading(false);
		}
	}
	return (
		<DialogShell
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={m.account_cancel_title()}
			description={m.account_cancel_description()}
		>
			<div class="flex justify-end gap-2 pt-4">
				<button
					type="button"
					class="inline-flex min-h-10 items-center rounded-md border border-border bg-card px-4 text-sm font-medium hover:bg-accent"
					onClick={() => props.onOpenChange(false)}
				>
					{m.account_cancel_action()}
				</button>
				<button
					type="button"
					class="text-destructive-foreground inline-flex min-h-10 items-center gap-2 rounded-md bg-destructive px-4 text-sm font-medium disabled:opacity-50"
					disabled={loading() || countdown() > 0}
					onClick={() => void handleCancel()}
				>
					<Show when={loading()}>
						<Loader2 class="size-4 animate-spin" aria-hidden="true" />
					</Show>
					{m.account_cancel_confirm()}
					{countdown() > 0 ? ' (' + countdown() + 's)' : ''}
				</button>
			</div>
		</DialogShell>
	);
}
