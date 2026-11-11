import { expect, test } from '@playwright/test';

test('desktop navbar groups display preferences and keeps Get Pro prominent', async ({ page }) => {
	await page.setViewportSize({ width: 1366, height: 768 });
	await page.goto('/?from=navbar#plans', { waitUntil: 'networkidle' });

	const upgrade = page.locator('header a[href="/get-pro"]');
	await expect(upgrade).toBeVisible();
	await expect(upgrade).toHaveClass(/border-signal/);

	const preferences = page.getByRole('button', { name: 'Language / Toggle theme' });
	await preferences.click();
	await expect(page.getByRole('menuitemradio', { name: 'English' })).toHaveAttribute(
		'aria-checked',
		'true'
	);
	await expect(page.getByRole('menuitem', { name: 'Dark Mode' })).toBeVisible();

	await page.getByRole('menuitem', { name: 'Dark Mode' }).click();
	await expect(page.locator('html')).toHaveClass(/dark/);

	await preferences.click();
	await expect(page.getByRole('menuitem', { name: 'Light Mode' })).toBeVisible();
	await page.getByRole('menuitemradio', { name: 'Italiano' }).click();
	await expect(page).toHaveURL(/\/it\?from=navbar#plans$/);
});

test('navbar keeps the compact menu at intermediate widths without overflow', async ({ page }) => {
	await page.goto('/', { waitUntil: 'networkidle' });

	for (const width of [390, 640, 768, 820, 1024, 1366]) {
		await page.setViewportSize({ width, height: 820 });
		const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
		expect(documentWidth, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(width);

		const mobileMenu = page.getByRole('button', { name: 'Open navigation menu' });
		if (width < 1024) {
			await expect(mobileMenu).toBeVisible();
		} else {
			await expect(mobileMenu).toBeHidden();
		}
	}

	await page.setViewportSize({ width: 390, height: 820 });
	await page.getByRole('button', { name: 'Open navigation menu' }).click();
	await expect(page.getByRole('link', { name: 'Get Pro' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Dark Mode' })).toBeVisible();
});
