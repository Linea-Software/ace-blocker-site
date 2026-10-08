import { describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../layout.css';

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost:5173/checkout?currency=EUR') }
}));
vi.mock('dodopayments-checkout', () => ({
	DodoPayments: {
		Initialize: () => {},
		Checkout: { open: () => {}, close: () => {} }
	}
}));

import Checkout from './+page.svelte';

describe('Checkout summary display', () => {
	it('separates amount due today from the EUR recurring price and trial', async () => {
		render(Checkout, {
			data: {
				isPro: false,
				checkoutUrl: 'https://test.checkout.dodopayments.com/checkout?session_id=fixture',
				currency: 'EUR',
				cycle: 'yearly',
				trialDays: 14,
				recurringPriceMinor: 2499,
				dueTodayMinor: 0
			}
		});
		await expect.element(page.getByText('14-day free trial')).toBeInTheDocument();
		await expect.element(page.getByText('€0,00')).toBeInTheDocument();
		await expect.element(page.getByText(/€24,99/)).toBeInTheDocument();
		await expect
			.element(page.getByText('Automatically renews yearly unless cancelled.'))
			.toBeInTheDocument();
		await page.screenshot({ path: '../../../test-results/checkout-summary-light.png' });
		document.documentElement.classList.add('dark');
		await page.screenshot({ path: '../../../test-results/checkout-summary-dark.png' });
	});
});
