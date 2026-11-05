import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ProActivationPanel from './ProActivationPanel.svelte';

describe('Pro desktop activation panel', () => {
	it('distinguishes verified web subscription from unconfirmed desktop delivery', async () => {
		render(ProActivationPanel, {
			status: 'pending',
			onactivate: vi.fn()
		});

		await expect
			.element(page.getByText('Pro subscription active on this account'))
			.toBeVisible();
		await expect
			.element(page.getByText('Sent to the operating system — not yet confirmed'))
			.toBeVisible();
		await expect.element(page.getByText('Confirm inside the app')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: 'Send license again' }))
			.toBeVisible();
	});

	it('shows an explicit error instead of claiming success', async () => {
		render(ProActivationPanel, {
			status: 'error',
			onactivate: vi.fn()
		});
		await expect.element(page.getByText('Could not send the license')).toBeVisible();
	});
});
