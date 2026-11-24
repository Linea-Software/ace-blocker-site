import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BlockedBrowserDemo from './BlockedBrowserDemo';
import * as m from '$lib/paraglide/messages';

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	container?.remove();
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 simulated network browser response', () => {
	it('shows HTTP 404 only for an active matching rule, without a real iframe or navigation', async () => {
		container = document.createElement('div');
		document.body.append(container);
		const [blocked, setBlocked] = createSignal(true);
		const navigate = vi.fn();
		const back = vi.fn();
		dispose = render(
			() => (
				<BlockedBrowserDemo
					domain="focus.example"
					phase="result"
					blocked={blocked()}
					onAddress={vi.fn()}
					onNavigate={navigate}
					onBack={back}
				/>
			),
			container
		);
		await expect.element(page.getByText('HTTP 404')).toBeVisible();
		await expect.element(page.getByText(m.demo_browser_404_title())).toBeVisible();
		expect(container.querySelector('iframe')).toBeNull();

		setBlocked(false);
		flush();
		await expect.element(page.getByText(m.demo_browser_allowed_title())).toBeVisible();
		await expect.element(page.getByText('HTTP 404')).not.toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
		expect(back).not.toHaveBeenCalled();
	});
});
