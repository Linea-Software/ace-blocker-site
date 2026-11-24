import { render } from '@solidjs/web';
import { createRouter, memoryHistory } from '@solidjs/router';
import { flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import { getLocale, overwriteGetLocale } from '$lib/paraglide/runtime';
import CheckoutPage from './index';
import '../layout.css';

const mocks = vi.hoisted(() => ({
	value: {
		checkoutUrl: 'https://test.checkout.dodopayments.com/checkout?session_id=unit-fixture',
		currency: 'EUR',
		cycle: 'yearly' as 'yearly' | 'monthly',
		trialDays: 14,
		recurringPriceMinor: 2499,
		dueTodayMinor: 0
	},
	onEvent: undefined as undefined | ((event: { event_type: string; data?: unknown }) => void),
	opens: 0,
	closes: 0
}));

vi.mock('./data', () => ({
	getCheckoutData: () => mocks.value
}));

vi.mock('dodopayments-checkout', () => ({
	DodoPayments: {
		Initialize: ({ onEvent }: { onEvent: typeof mocks.onEvent }) => {
			mocks.onEvent = onEvent;
		},
		Checkout: {
			open: () => {
				mocks.opens += 1;
			},
			close: () => {
				mocks.closes += 1;
			}
		}
	}
}));

const originalGetLocale = getLocale;
let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

function mount(search = '?cycle=yearly&currency=EUR') {
	container = document.createElement('div');
	document.body.append(container);
	const Router = createRouter({
		routes: [{ path: '/checkout', component: CheckoutPage }],
		history: memoryHistory('/checkout' + search)
	});
	dispose = render(() => <Router>{(props) => props.children}</Router>, container);
	flush();
}

beforeEach(async () => {
	await page.viewport(1440, 900);
	mocks.onEvent = undefined;
	mocks.opens = 0;
	mocks.closes = 0;
	mocks.value.cycle = 'yearly';
	mocks.value.trialDays = 14;
	mocks.value.recurringPriceMinor = 2499;
	mocks.value.dueTodayMinor = 0;
});

afterEach(() => {
	overwriteGetLocale(originalGetLocale);
	dispose?.();
	container?.remove();
	dispose = undefined;
	container = undefined;
	document.documentElement.classList.remove('dark');
});

describe('Solid 2 inline checkout summary with an isolated Dodo mock', () => {
	it('separates 14-day trial amount due today from yearly recurring EUR price', async () => {
		mount();
		await expect
			.element(
				page.getByRole('heading', { name: m.inline_checkout_trial_title({ days: 14 }) })
			)
			.toBeVisible();
		await expect
			.element(page.getByRole('heading', { name: m.inline_checkout_payment_details() }))
			.toBeVisible();
		await expect.element(page.getByText('€0,00', { exact: true }).last()).toBeVisible();
		await expect.element(page.getByText('€24,99', { exact: true }).last()).toBeVisible();
		await expect
			.element(page.getByText(m.inline_checkout_auto_renew_yearly()).last())
			.toBeVisible();
		await expect
			.element(page.getByRole('link', { name: m.inline_checkout_back() }))
			.toHaveAttribute('href', '/get-pro?cycle=yearly&currency=EUR');
		await expect.element(page.getByRole('status')).toBeInTheDocument();
		await expect.element(page.getByText('14-day free trial')).toBeVisible();
		expect(mocks.opens).toBeLessThanOrEqual(1);
		await page.viewport(375, 812);
		const mobileSummary = document
			.querySelector('#checkout-mobile-summary')!
			.getBoundingClientRect();
		const payment = document.querySelector('section')!.getBoundingClientRect();
		expect(mobileSummary.height).toBeGreaterThan(0);
		expect(mobileSummary.top).toBeLessThan(payment.top);
		await page.screenshot({ path: '../../../test-results/solid-checkout-mobile-light.png' });
		document.documentElement.classList.add('dark');
		await page.screenshot({ path: '../../../test-results/solid-checkout-mobile-dark.png' });
		await page.viewport(1440, 900);
		const desktopSummary = document.querySelector('aside')!.getBoundingClientRect();
		const desktopPayment = document.querySelector('section')!.getBoundingClientRect();
		expect(desktopSummary.width).toBeGreaterThan(0);
		expect(desktopPayment.left).toBeLessThan(desktopSummary.left);
		await page.screenshot({ path: '../../../test-results/solid-checkout-desktop-dark.png' });
		document.documentElement.classList.remove('dark');
		await page.screenshot({ path: '../../../test-results/solid-checkout-desktop-light.png' });
	});

	it('keeps the payment surface and a retry option when the mock checkout fails', async () => {
		mocks.value.trialDays = 0;
		mocks.value.cycle = 'monthly';
		mocks.value.dueTodayMinor = 2499;
		mount('?cycle=monthly&currency=EUR');
		await expect
			.element(page.getByRole('heading', { name: 'Start your Pro subscription' }))
			.toBeVisible();
		await vi.waitFor(() => expect(mocks.onEvent).toBeTypeOf('function'));
		mocks.onEvent!({ event_type: 'checkout.error' });
		flush();
		await expect.element(page.getByRole('alert')).toBeVisible();
		await expect
			.element(page.getByRole('button', { name: m.inline_checkout_retry() }))
			.toBeVisible();
		const surface = document.querySelector('#dodo-inline-checkout')?.parentElement;
		expect(surface).toBeDefined();
		expect(surface!.getBoundingClientRect().height).toBeGreaterThan(400);
	});

	it('removes its loading placeholder when the fake Dodo form becomes ready', async () => {
		mount();
		const surface = document.querySelector('#dodo-inline-checkout')?.parentElement;
		expect(surface?.className).toContain('min-h-[28rem]');
		await vi.waitFor(() => expect(mocks.onEvent).toBeTypeOf('function'));
		mocks.onEvent!({ event_type: 'checkout.form_ready' });
		flush();
		await expect.element(page.getByRole('status')).not.toBeInTheDocument();
		expect(surface?.className).not.toContain('min-h-[28rem]');
	});

	it('renders Italian checkout terms for the selected locale', async () => {
		overwriteGetLocale(() => 'it');
		mount();
		await expect.element(page.getByRole('heading', { name: 'Pagamento sicuro' })).toBeVisible();
		await expect.element(page.getByText('Riepilogo ordine').first()).toBeVisible();
		await expect
			.element(page.getByText(/Si rinnova automaticamente ogni anno/).last())
			.toBeVisible();
	});
});
