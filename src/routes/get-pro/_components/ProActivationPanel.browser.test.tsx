import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import ProActivationPanel, { type ActivationStatus } from './ProActivationPanel';

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	container?.remove();
	dispose = undefined;
	container = undefined;
});

function mount(initial: ActivationStatus) {
	container = document.createElement('div');
	document.body.append(container);
	const onActivate = vi.fn();
	const [status, setStatus] = createSignal<ActivationStatus>(initial);
	dispose = render(
		() => <ProActivationPanel status={status} onActivate={onActivate} />,
		container
	);
	return { onActivate, setStatus };
}

describe('Solid 2 Pro desktop activation', () => {
	it('distinguishes an active web subscription from pending desktop delivery', async () => {
		const { onActivate } = mount('pending');
		await expect.element(page.getByText(m.pro_activation_web_active())).toBeVisible();
		await expect.element(page.getByText(m.pro_activation_status_pending())).toBeVisible();
		await expect.element(page.getByText(m.pro_activation_pending_detail())).toBeVisible();
		await expect
			.element(page.getByRole('link', { name: m.device_link_title() }))
			.toHaveAttribute('href', '/connect');
		await page.getByRole('button', { name: m.pro_activation_retry() }).click();
		expect(onActivate).toHaveBeenCalledTimes(1);
	});

	it('shows an explicit failure, never a confirmed activation', async () => {
		const { setStatus } = mount('pending');
		setStatus('error');
		flush();
		await expect.element(page.getByText(m.pro_activation_status_error())).toBeVisible();
		await expect.element(page.getByText(m.pro_activation_error_detail())).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: m.pro_activation_retry() }))
			.toBeVisible();
	});

	it('disables the activation action while a link is already in progress', async () => {
		mount('loading');
		await expect
			.element(page.getByRole('button', { name: m.pro_activation_open() }))
			.toBeDisabled();
	});
});
