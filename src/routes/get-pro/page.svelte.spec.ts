import { page } from 'vitest/browser';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import '../layout.css';

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost:5173/get-pro') }
}));
vi.mock('$lib/auth-client', async () => {
	const { readable } = await import('svelte/store');
	return { authClient: { useSession: () => readable({ data: null }) } };
});

import GetProPage from './+page.svelte';

const pricing = {
	currency: 'EUR' as const,
	monthlyPrice: '€3,99',
	yearlyPrice: '€24,99',
	yearlyStrikethrough: '€47,88',
	yearlySavings: '€22,89',
	discountPercent: 48,
	monthlyTrialDays: 14,
	yearlyTrialDays: 14,
	monthlySlug: 'fixture-monthly',
	yearlySlug: 'fixture-yearly'
};

describe('/get-pro subscription-aware content', () => {
	it('shows active subscribers their Pro benefits and both feature demos', async () => {
		render(GetProPage, { data: { isPro: true, pricing } });

		await expect
			.element(page.getByText('Pro subscription active on this account'))
			.toBeVisible();
		const benefits = page.getByTestId('active-pro-features');
		await expect.element(benefits).toBeVisible();
		for (const item of [
			'All categories',
			'Custom Lists',
			'Resistance tools',
			'Cloud backup',
			'Network blocks'
		]) {
			await expect.element(benefits.getByText(item, { exact: true })).toBeVisible();
		}
		await expect
			.element(
				page.getByRole('heading', { name: 'Resistance changes the experience itself.' })
			)
			.toBeVisible();
		await expect
			.element(
				page.getByRole('heading', { name: 'Start with a category, not a domain list.' })
			)
			.toBeVisible();
		await expect.element(page.getByTestId('resistance-demo')).toBeVisible();
		await expect
			.element(
				page.getByRole('button', { name: 'Use legacy app link (browser confirmation)' })
			)
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: 'Core blocking is free. Pro adds more.' }))
			.not.toBeInTheDocument();

		await page.viewport(1440, 900);
		await page.screenshot({
			path: '../../../test-results/get-pro-pro-desktop-light.png',
			fullPage: true
		});
		document.documentElement.classList.add('dark');
		await page.screenshot({
			path: '../../../test-results/get-pro-pro-desktop-dark.png',
			fullPage: true
		});
		await page.viewport(390, 844);
		const controls = page.getByRole('button', { name: 'Choose the interventions' });
		await expect.element(controls).toHaveAttribute('aria-expanded', 'false');
		await controls.click();
		await expect.element(controls).toHaveAttribute('aria-expanded', 'true');
		expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
		await page.screenshot({
			path: '../../../test-results/get-pro-pro-mobile-dark.png',
			fullPage: true
		});
		document.documentElement.classList.remove('dark');
		await page.viewport(1440, 900);
	});

	it('keeps the purchase comparison and feature demos for Free visitors', async () => {
		render(GetProPage, { data: { isPro: false, pricing } });

		await expect
			.element(page.getByRole('heading', { name: 'Core blocking is free. Pro adds more.' }))
			.toBeVisible();
		await expect
			.element(
				page.getByRole('heading', { name: 'Resistance changes the experience itself.' })
			)
			.toBeVisible();
		await expect.element(page.getByTestId('active-pro-features')).not.toBeInTheDocument();
		await expect
			.element(page.getByText('Pro subscription active on this account'))
			.not.toBeInTheDocument();
	});
});
