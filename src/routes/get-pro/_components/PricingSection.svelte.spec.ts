import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PricingSection from './PricingSection.svelte';

describe('Free and Pro feature comparison', () => {
	it('includes network blocks in both plans without inventing a plan limit', async () => {
		render(PricingSection, {
			pricing: {
				monthlyPrice: '$3.99',
				yearlyPrice: '$24.99',
				yearlyStrikethrough: '$47.88',
				yearlySavings: '$22.89',
				discountPercent: 48,
				monthlyTrialDays: 14,
				yearlyTrialDays: 14
			},
			onupgrade: () => {}
		});

		const row = page
			.getByRole('row')
			.filter({ has: page.getByRole('rowheader', { name: 'Network blocks' }) });

		await expect.element(row.getByRole('cell').nth(0)).toHaveTextContent('Included');
		await expect.element(row.getByRole('cell').nth(1)).toHaveTextContent('Included');

		const resistance = page
			.getByRole('row')
			.filter({ has: page.getByRole('rowheader', { name: 'Resistance tools' }) });
		await expect.element(resistance.getByRole('cell').nth(0)).toHaveTextContent('Not included');
		await expect.element(resistance.getByRole('cell').nth(1)).toHaveTextContent('Included');
	});
});
