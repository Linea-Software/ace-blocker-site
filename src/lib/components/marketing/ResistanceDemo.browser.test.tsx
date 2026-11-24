import { render } from '@solidjs/web';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import ResistanceDemo from './ResistanceDemo';

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	container?.remove();
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 Resistance marketing demo', () => {
	it('starts without autoplay, with CAPTCHA opt-in, and manual site switching cancels playback', async () => {
		container = document.createElement('div');
		document.body.append(container);
		dispose = render(() => <ResistanceDemo />, container);
		const demo = page.getByTestId('resistance-demo');
		await expect.element(demo).toHaveAttribute('data-demo-ready', 'true');
		const captcha = demo.getByTestId('category-captcha');
		const selectCaptcha = captcha.getByRole('checkbox', {
			name: m.demo_select_category({ category: m.demo_captcha() })
		});
		await expect.element(selectCaptcha).not.toBeChecked();
		await expect.element(demo.getByRole('button', { name: m.demo_play() })).toBeVisible();
		await demo.getByRole('button', { name: m.demo_play() }).click();
		await expect.element(demo.getByRole('button', { name: m.demo_pause() })).toBeVisible();
		await demo.getByTestId('resistance-preview-site').selectOptions('youtube.com');
		flush();
		await expect
			.element(demo.getByTestId('resistance-preview-site'))
			.toHaveValue('youtube.com');
		await expect.element(demo.getByRole('button', { name: m.demo_play() })).toBeVisible();
		await expect.element(selectCaptcha).not.toBeChecked();
	});
});
