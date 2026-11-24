import { render } from '@solidjs/web';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it } from 'vitest';
import * as m from '$lib/paraglide/messages';
import NetworkBlockDemo from './NetworkBlockDemo';

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	container?.remove();
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 Network Blocks marketing walkthrough', () => {
	it('starts without autoplay and keeps the Next action disabled until a target is selected', async () => {
		container = document.createElement('div');
		document.body.append(container);
		dispose = render(() => <NetworkBlockDemo />, container);
		const demo = page.getByTestId('network-demo');
		await expect.element(demo).toHaveAttribute('data-demo-ready', 'true');
		const next = demo.getByRole('button', { name: m.demo_next() }).first();
		await expect.element(next).toBeDisabled();
		await expect.element(demo.getByRole('button', { name: m.demo_play() })).toBeVisible();
		const social = demo.getByRole('checkbox', { name: m.site_pack_social() });
		await social.click();
		flush();
		await expect.element(next).toBeEnabled();
		await next.click();
		flush();
		await expect
			.element(demo.getByRole('heading', { name: m.demo_schedule_heading() }))
			.toBeVisible();
		await expect.element(demo.getByRole('button', { name: m.demo_play() })).toBeVisible();
	});
});
