import { beforeEach, describe, expect, it, vi } from 'vitest';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import '../layout.css';
import { getLocale, setLocale } from '$lib/paraglide/runtime';

vi.mock('$app/state', () => ({
	page: { url: new URL('http://localhost:5173/checkout?currency=EUR') }
}));
const checkoutEmitter: { send?: (event: { event_type: string }) => void } = {};
vi.mock('dodopayments-checkout', () => ({
	DodoPayments: {
		Initialize: ({ onEvent }: { onEvent: (event: { event_type: string }) => void }) => {
			checkoutEmitter.send = onEvent;
		},
		Checkout: { open: () => {}, close: () => {} }
	}
}));

import Checkout from './+page.svelte';

describe('Checkout summary display', () => {
	beforeEach(() => {
		checkoutEmitter.send = undefined;
	});

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
		await expect
			.element(page.getByRole('heading', { name: 'Start your 14-day Pro trial' }))
			.toBeInTheDocument();
		await expect
			.element(page.getByRole('heading', { name: 'Secure checkout' }))
			.toBeInTheDocument();
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		await expect
			.element(page.getByRole('link', { name: /Back to plans/ }))
			.toHaveAttribute('href', '/get-pro?cycle=yearly&currency=EUR');
		await expect.element(page.getByText('14-day free trial')).toBeInTheDocument();
		await expect.element(page.getByText('€0,00')).toBeInTheDocument();
		await expect.element(page.getByText(/€24,99/)).toBeInTheDocument();
		await expect
			.element(page.getByText('Renews automatically each year unless you cancel.'))
			.toBeInTheDocument();
		await page.viewport(375, 812);
		const mobileSummary = document.querySelector('aside')?.getBoundingClientRect();
		const mobilePayment = document.querySelector('section')?.getBoundingClientRect();
		expect(mobileSummary).toBeDefined();
		expect(mobilePayment).toBeDefined();
		expect(mobileSummary!.top).toBeLessThan(mobilePayment!.top);
		await page.screenshot({ path: '../../../test-results/checkout-summary-light.png' });
		document.documentElement.classList.add('dark');
		await page.screenshot({ path: '../../../test-results/checkout-summary-dark.png' });

		await page.viewport(1440, 900);
		const desktopSummary = document.querySelector('aside')?.getBoundingClientRect();
		const desktopPayment = document.querySelector('section')?.getBoundingClientRect();
		expect(desktopSummary).toBeDefined();
		expect(desktopPayment).toBeDefined();
		expect(desktopPayment!.left).toBeLessThan(desktopSummary!.left);
		await page.screenshot({ path: '../../../test-results/checkout-summary-desktop-dark.png' });
		document.documentElement.classList.remove('dark');
		await page.screenshot({ path: '../../../test-results/checkout-summary-desktop-light.png' });
	});

	it('renders checkout terms in the selected Italian site locale', async () => {
		setLocale('it', { reload: false });
		try {
			expect(getLocale()).toBe('it');
			render(Checkout, {
				data: {
					isPro: false,
					checkoutUrl:
						'https://test.checkout.dodopayments.com/checkout?session_id=fixture',
					currency: 'EUR',
					cycle: 'yearly',
					trialDays: 14,
					recurringPriceMinor: 2499,
					dueTodayMinor: 0
				}
			});
			await expect
				.element(page.getByRole('heading', { name: 'Pagamento sicuro' }))
				.toBeInTheDocument();
			await expect.element(page.getByText('Riepilogo ordine')).toBeInTheDocument();
			await expect
				.element(page.getByText(/Si rinnova automaticamente ogni anno/))
				.toBeInTheDocument();
		} finally {
			setLocale('en', { reload: false });
		}
	});

	it('releases the placeholder height when Dodo reports its form ready', async () => {
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
		const surface = document.querySelector('#dodo-inline-checkout')?.parentElement;
		expect(surface?.className).toContain('min-h-[28rem]');
		await vi.waitFor(() => expect(checkoutEmitter.send).toBeDefined());
		const emitEvent = checkoutEmitter.send as (event: { event_type: string }) => void;
		emitEvent({ event_type: 'checkout.form_ready' });
		await expect.element(page.getByRole('status')).not.toBeInTheDocument();
		expect(surface?.className).not.toContain('min-h-[28rem]');
	});

	it('keeps the payment surface visible and offers retry when Dodo fails to initialize', async () => {
		render(Checkout, {
			data: {
				isPro: false,
				checkoutUrl: 'https://test.checkout.dodopayments.com/checkout?session_id=fixture',
				currency: 'EUR',
				cycle: 'monthly',
				trialDays: 0,
				recurringPriceMinor: 2499,
				dueTodayMinor: 2499
			}
		});
		await expect
			.element(page.getByRole('heading', { name: 'Start your Pro subscription' }))
			.toBeInTheDocument();
		await vi.waitFor(() => expect(checkoutEmitter.send).toBeDefined());
		const emitEvent = checkoutEmitter.send as (event: { event_type: string }) => void;
		emitEvent({ event_type: 'checkout.error' });
		await expect.element(page.getByRole('alert')).toBeInTheDocument();
		await expect.element(page.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
		const paymentSurface = document.querySelector('#dodo-inline-checkout')?.parentElement;
		expect(paymentSurface).toBeDefined();
		expect(paymentSurface!.getBoundingClientRect().height).toBeGreaterThan(400);
	});
});
