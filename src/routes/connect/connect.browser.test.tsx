import { render } from '@solidjs/web';
import { createRouter, memoryHistory } from '@solidjs/router';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages.js';
import ConnectPage from './index';

vi.mock('$lib/auth-client', () => ({
	authClient: { useSession: () => () => ({ data: { user: { id: 'fixture-user' } } }) }
}));
vi.mock('$lib/components/Navbar', () => ({ default: () => null }));
vi.mock('$lib/components/marketing/MarketingFooter', () => ({ default: () => null }));

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

function mount(search = '') {
	container = document.createElement('div');
	document.body.append(container);
	const Router = createRouter({
		routes: [{ path: '/connect', component: ConnectPage }],
		history: memoryHistory('/connect' + search)
	});
	dispose = render(() => <Router>{(props) => props.children}</Router>, container);
	flush();
}

afterEach(() => {
	dispose?.();
	container?.remove();
	container = undefined;
	dispose = undefined;
	vi.restoreAllMocks();
});

describe('Solid 2 device linking — local browser fixtures only', () => {
	it('rejects invalid confirmation codes before any request can be submitted', async () => {
		mount('?code=invalid%26deviceCode%3Dsecret');
		const confirm = page.getByRole('button', { name: m.device_link_confirm() });
		await expect.element(confirm).toBeDisabled();
		await expect
			.element(page.getByRole('textbox', { name: m.device_link_code_label() }))
			.toHaveValue('');
	});

	it('preloads a valid code and only calls the mocked same-origin approval endpoint', async () => {
		const sent = vi
			.spyOn(window, 'fetch')
			.mockResolvedValue(new Response(null, { status: 204 }));
		mount('?code=ABCD-EFGH-JKLM');
		const confirm = page.getByRole('button', { name: m.device_link_confirm() });
		await expect.element(confirm).toBeEnabled();
		await confirm.click();
		flush();
		await expect
			.element(page.getByRole('heading', { name: m.device_link_success_title() }))
			.toBeVisible();
		expect(sent).toHaveBeenCalledTimes(1);
		expect(sent).toHaveBeenCalledWith(
			'/api/device-link/approve',
			expect.objectContaining({
				method: 'POST',
				credentials: 'same-origin',
				body: JSON.stringify({ code: 'ABCD-EFGH-JKLM' })
			})
		);
	});
});
