import { render } from '@solidjs/web';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import CancelSubscriptionDialog from './_components/CancelSubscriptionDialog';
import DeleteAccountDialog from './_components/DeleteAccountDialog';

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

function mount(component: () => import('@solidjs/web').JSX.Element) {
	container = document.createElement('div');
	document.body.append(container);
	dispose = render(component, container);
	flush();
}

afterEach(() => {
	dispose?.();
	container?.remove();
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 account safety dialogs', () => {
	it('never enables cancellation immediately on opening the confirmation dialog', async () => {
		const notify = vi.fn();
		const changed = vi.fn();
		mount(() => (
			<CancelSubscriptionDialog
				open
				onOpenChange={vi.fn()}
				notify={notify}
				onChanged={changed}
			/>
		));
		const confirmation = page.getByRole('button', {
			name: new RegExp(m.account_cancel_confirm())
		});
		await expect.element(confirmation).toBeDisabled();
		expect(notify).not.toHaveBeenCalled();
		expect(changed).not.toHaveBeenCalled();
	});

	it('requires an exact matching account email before enabling destructive confirmation', async () => {
		const accountEmail = 'subscriber@example.invalid';
		const onOpenChange = vi.fn();
		mount(() => <DeleteAccountDialog open email={accountEmail} onOpenChange={onOpenChange} />);
		const deleteButton = page.getByRole('button', { name: m.account_delete_button() });
		const emailField = page.getByRole('textbox');
		await expect.element(deleteButton).toBeDisabled();
		await emailField.fill('other@example.invalid');
		flush();
		await expect.element(deleteButton).toBeDisabled();
		await emailField.fill(accountEmail);
		flush();
		await expect.element(deleteButton).toBeEnabled();
		// Do not click: deleting an account is never part of browser tests.
		expect(onOpenChange).not.toHaveBeenCalled();
	});
});
