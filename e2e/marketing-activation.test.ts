import { test, expect } from '@playwright/test';

test('marketing timeline explains both continuously active and scheduled blocks', async ({
	page
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/');
	// Wait for SvelteKit hydration before exercising client-side interactions.
	await page.waitForLoadState('networkidle');

	const demo = page.locator('.schedule-card').first();
	const modes = demo.locator('.activation-choice');

	await expect(modes.getByRole('button', { name: '24/7' })).toHaveAttribute(
		'aria-pressed',
		'true'
	);
	await expect(demo.locator('.window.all-day')).toHaveCount(7);

	await modes.getByRole('button', { name: /MON.FRI/i }).click();
	await expect(demo.locator('.window.all-day')).toHaveCount(0);
	await expect(demo.locator('.window')).toHaveCount(5);

	await modes.getByRole('button', { name: '24/7' }).click();
	await expect(demo.locator('.window.all-day')).toHaveCount(7);

	const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
	expect(overflow).toBe(false);
});
