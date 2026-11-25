import { render } from '@solidjs/web';
import { createSignal, flush } from 'solid-js';
import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import * as m from '$lib/paraglide/messages';
import PricingSection, { type Pricing } from './PricingSection';

const pricing: Pricing = {
	currency: 'EUR',
	monthlyPrice: '€3,99',
	yearlyPrice: '€24,99',
	yearlyStrikethrough: '€47,88',
	yearlySavings: '€22,89',
	discountPercent: 48,
	monthlyTrialDays: 14,
	yearlyTrialDays: 14
};

let container: HTMLDivElement | undefined;
let dispose: (() => void) | undefined;

afterEach(() => {
	dispose?.();
	container?.remove();
	dispose = undefined;
	container = undefined;
});

function mount(currency: Pricing['currency'] = pricing.currency) {
	container = document.createElement('div');
	document.body.append(container);
	const upgrade = vi.fn();
	const [cycle, setCycle] = createSignal<'yearly' | 'monthly'>('yearly');
	dispose = render(
		() => (
			<PricingSection
				pricing={{ ...pricing, currency }}
				billingCycle={cycle}
				setBillingCycle={setCycle}
				onUpgrade={upgrade}
			/>
		),
		container
	);
	return { upgrade };
}

describe('Solid 2 pricing comparison', () => {
	it.each([
		['USD', '$0'],
		['EUR', '€0'],
		['GBP', '£0'],
		['INR', '₹0']
	] as const)('shows the free plan in %s', async (currency, price) => {
		mount(currency);
		await expect.element(page.getByText(price, { exact: true })).toBeVisible();
	});

	it('includes network blocks for Free and Pro and distinguishes Resistance tools', async () => {
		mount();
		const network = page.getByRole('row').filter({
			has: page.getByRole('rowheader', { name: m.pricing_network_blocks() })
		});
		await expect
			.element(network.getByRole('cell').nth(0))
			.toHaveTextContent(m.pricing_included());
		await expect
			.element(network.getByRole('cell').nth(1))
			.toHaveTextContent(m.pricing_included());

		const resistance = page.getByRole('row').filter({
			has: page.getByRole('rowheader', { name: m.pricing_resistance() })
		});
		await expect
			.element(resistance.getByRole('cell').nth(0))
			.toHaveTextContent(m.pricing_not_included());
		await expect
			.element(resistance.getByRole('cell').nth(1))
			.toHaveTextContent(m.pricing_included());
	});

	it('updates billing amount and trial disclosure without triggering checkout', async () => {
		const { upgrade } = mount();
		await expect.element(page.getByText(pricing.yearlyPrice)).toBeVisible();
		const monthly = page.getByRole('button', { name: m.pricing_cycle_monthly() });
		await monthly.click();
		flush();
		await expect.element(monthly).toHaveAttribute('aria-pressed', 'true');
		await expect.element(page.getByText(pricing.monthlyPrice)).toBeVisible();
		expect(upgrade).not.toHaveBeenCalled();
	});

	it('calls only the supplied upgrade callback when the trial CTA is selected', async () => {
		const { upgrade } = mount();
		await page.getByRole('button', { name: m.pricing_start_trial() }).click();
		expect(upgrade).toHaveBeenCalledTimes(1);
	});
});
