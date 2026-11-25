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

function mount(currency: Pricing['currency'] = pricing.currency, overrides: Partial<Pricing> = {}) {
	container = document.createElement('div');
	document.body.append(container);
	const upgrade = vi.fn();
	const [cycle, setCycle] = createSignal<'yearly' | 'monthly'>('yearly');
	dispose = render(
		() => (
			<PricingSection
				pricing={{ ...pricing, currency, ...overrides }}
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

	it('offers a download instead of requiring registration on Free', async () => {
		mount();
		await expect
			.element(page.getByRole('link', { name: m.nav_download(), exact: true }))
			.toHaveAttribute('href', '/download');
		await expect
			.element(page.getByRole('link', { name: m.cta_get_started() }))
			.not.toBeInTheDocument();
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

		const rows = [
			[m.pricing_curated_packs(), m.pricing_three_packs(), m.pricing_all_packs()],
			[m.pricing_resistance(), m.pricing_standard_resistance(), m.pricing_full_resistance()],
			[m.pricing_resistance_lock(), m.pricing_not_included(), m.pricing_included()],
			[m.pricing_cloud_backup(), m.pricing_not_included(), m.pricing_included()],
			[m.pricing_custom_packs(), m.pricing_not_included(), m.pricing_included()]
		];
		for (const [label, free, pro] of rows) {
			const row = page.getByRole('row').filter({
				has: page.getByRole('rowheader', { name: label, exact: true })
			});
			await expect.element(row.getByRole('cell').nth(0)).toHaveTextContent(free);
			await expect.element(row.getByRole('cell').nth(1)).toHaveTextContent(pro);
		}
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

	it('uses the catalog trial duration rather than assuming fourteen days', async () => {
		mount('EUR', { yearlyTrialDays: 7, monthlyTrialDays: 0 });
		await expect
			.element(page.getByRole('button', { name: m.pricing_start_trial({ days: 7 }) }))
			.toBeVisible();
		await expect.element(page.getByText(/Free for 7 days/)).toBeVisible();
		await page.getByRole('button', { name: m.pricing_cycle_monthly() }).click();
		await expect
			.element(page.getByRole('button', { name: m.pricing_get_pro_action() }))
			.toBeVisible();
	});

	it('does not advertise a yearly discount when the catalog has no savings', async () => {
		mount('EUR', { discountPercent: 0, yearlySavings: '€0,00' });
		await expect
			.element(page.getByText(m.pricing_save_percent({ percent: 0 })))
			.not.toBeInTheDocument();
		await expect
			.element(page.getByText(pricing.yearlyStrikethrough, { exact: true }))
			.not.toBeInTheDocument();
	});

	it('calls only the supplied upgrade callback when the trial CTA is selected', async () => {
		const { upgrade } = mount();
		await page.getByRole('button', { name: m.pricing_start_trial({ days: 14 }) }).click();
		expect(upgrade).toHaveBeenCalledTimes(1);
	});
});
