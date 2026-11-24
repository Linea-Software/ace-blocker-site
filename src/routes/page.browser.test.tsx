import { render } from '@solidjs/web';
import { createRouter, memoryHistory } from '@solidjs/router';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import HomePage from './index';

const fixture = vi.hoisted(() => ({
	home: { isPro: false, newRelease: null as null | { version: string } }
}));

vi.mock('./home-data', () => ({ getHomeData: () => fixture.home }));
vi.mock('$lib/auth-client', () => ({
	authClient: { useSession: () => () => ({ data: null }), signOut: async () => {} }
}));
vi.mock('$lib/components/Navbar', () => ({ default: () => null }));
vi.mock('$lib/components/marketing/MarketingFooter', () => ({ default: () => null }));
vi.mock('$lib/components/marketing/NetworkBlockDemo', () => ({
	default: () => <section data-testid="network-demo" />
}));
vi.mock('$lib/components/marketing/ResistanceDemo', () => ({
	default: () => <section data-testid="resistance-demo" />
}));
vi.mock('$lib/components/marketing/SitePackVisual', () => ({ default: () => <div /> }));
vi.mock('$lib/components/marketing/ScheduleTimeline', () => ({ default: () => <div /> }));

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

function mount() {
	container = document.createElement('div');
	document.body.append(container);
	const Router = createRouter({
		routes: [{ path: '/', component: HomePage }],
		history: memoryHistory('/')
	});
	dispose = render(() => <Router>{(props) => props.children}</Router>, container);
	flush();
}

afterEach(() => {
	dispose?.();
	container?.remove();
	fixture.home.newRelease = null;
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 homepage content and composition', () => {
	it('preserves category-first marketing headings and slots for both demos', async () => {
		mount();
		await expect
			.element(page.getByRole('heading', { level: 1, name: m.home_title() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.home_resistance_title() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.home_schedule_title() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.home_packs_title() }))
			.toBeVisible();
		await expect
			.element(page.getByText(m.home_packs_description(), { exact: true }))
			.toBeVisible();
		await expect.element(page.getByTestId('network-demo')).toBeInTheDocument();
		await expect.element(page.getByTestId('resistance-demo')).toBeInTheDocument();
	});

	it('announces the current release when the loader marks a new version', async () => {
		fixture.home.newRelease = { version: '1.2.3' };
		mount();
		await expect
			.element(page.getByText(m.home_release_version_available({ version: '1.2.3' })))
			.toBeVisible();
	});
});
