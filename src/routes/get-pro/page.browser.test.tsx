import { render } from '@solidjs/web';
import { createRouter, memoryHistory } from '@solidjs/router';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import GetProPage from './index';
import '../layout.css';

const fixture = vi.hoisted(() => ({
	isPro: false,
	pricing: {
		currency: 'EUR',
		monthlyPrice: '€3,99',
		yearlyPrice: '€24,99',
		yearlyStrikethrough: '€47,88',
		yearlySavings: '€22,89',
		discountPercent: 48,
		monthlyTrialDays: 14,
		yearlyTrialDays: 14,
		monthlySlug: 'unit-monthly',
		yearlySlug: 'unit-yearly'
	}
}));

vi.mock('./data', () => ({
	getPricingData: () => ({ isPro: fixture.isPro, pricing: fixture.pricing })
}));
vi.mock('$lib/auth-client', () => ({
	authClient: { useSession: () => () => ({ data: null }), signOut: async () => {} }
}));
vi.mock('$lib/components/Navbar', () => ({ default: () => null }));
vi.mock('$lib/components/marketing/MarketingFooter', () => ({ default: () => null }));
vi.mock('$lib/components/marketing/SitePackVisual', () => ({
	default: () => <section data-testid="site-pack-demo" />
}));

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

function mount() {
	container = document.createElement('div');
	document.body.append(container);
	const Router = createRouter({
		routes: [{ path: '/get-pro', component: GetProPage }],
		history: memoryHistory('/get-pro')
	});
	dispose = render(() => <Router>{(props) => props.children}</Router>, container);
	flush();
}

afterEach(() => {
	dispose?.();
	container?.remove();
	fixture.isPro = false;
	document.documentElement.classList.remove('dark');
	container = undefined;
	dispose = undefined;
});

describe('Solid 2 Pro page for Free versus subscribed visitors', () => {
	it('retains purchase comparison and explanatory feature demos for Free visitors', async () => {
		fixture.isPro = false;
		mount();
		await expect.element(page.getByRole('heading', { name: m.pro_title() })).toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.pricing_compare_title() }))
			.toBeVisible();
		await expect.element(page.getByTestId('active-pro-features')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('resistance-demo')).toBeInTheDocument();
		await expect.element(page.getByTestId('site-pack-demo')).toBeInTheDocument();
	});

	it('explains active Pro benefits without showing another purchase comparison', async () => {
		fixture.isPro = true;
		mount();
		await expect.element(page.getByText(m.pro_activation_web_active())).toBeVisible();
		const benefits = page.getByTestId('active-pro-features');
		await expect.element(benefits).toBeVisible();
		for (const benefit of [
			m.pricing_all_packs(),
			m.pricing_custom_packs(),
			m.pricing_resistance(),
			m.pricing_cloud_backup(),
			m.pricing_network_blocks()
		]) {
			await expect.element(benefits.getByText(benefit, { exact: true })).toBeVisible();
		}
		await expect.element(page.getByTestId('resistance-demo')).toBeInTheDocument();
		await expect.element(page.getByTestId('site-pack-demo')).toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: m.about_resistance_title() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.about_packs_title() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('button', { name: m.pro_activation_open() }))
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.pricing_compare_title() }))
			.not.toBeInTheDocument();
		await page.viewport(1440, 900);
		await page.screenshot({
			path: '../../../test-results/solid-get-pro-desktop-light.png',
			fullPage: true
		});
		document.documentElement.classList.add('dark');
		await page.screenshot({
			path: '../../../test-results/solid-get-pro-desktop-dark.png',
			fullPage: true
		});
		await page.viewport(390, 844);
		const controls = page.getByRole('button', { name: m.demo_interventions_heading() });
		await expect.element(controls).toHaveAttribute('aria-expanded', 'false');
		await controls.click();
		await expect.element(controls).toHaveAttribute('aria-expanded', 'true');
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
		await page.screenshot({
			path: '../../../test-results/solid-get-pro-mobile-dark.png',
			fullPage: true
		});
		document.documentElement.classList.remove('dark');
		await page.viewport(1440, 900);
	});
});
