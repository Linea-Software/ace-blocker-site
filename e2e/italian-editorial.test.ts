import { expect, test } from '@playwright/test';

test('Italian FAQ and homepage copy on desktop and mobile', async ({ page }) => {
	test.setTimeout(45_000);
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto('/it/faq');
	await expect(
		page.getByText('Le funzioni essenziali per bloccare i siti sono gratuite.')
	).toBeVisible();
	await page.screenshot({ path: 'test-results/editorial-faq-it-desktop.png', fullPage: true });
	await page.goto('/it', { waitUntil: 'domcontentloaded' });
	await expect(page.getByText('Privacy fin dalla progettazione')).toBeVisible();
	await page.screenshot({ path: 'test-results/editorial-home-it-desktop.png', fullPage: true });
	await page.setViewportSize({ width: 375, height: 760 });
	await page.screenshot({ path: 'test-results/editorial-home-it-mobile.png', fullPage: true });
	await page.getByRole('button', { name: 'Apri il menu di navigazione' }).click();
	await page.getByRole('button', { name: 'Tema scuro' }).click();
	await page.keyboard.press('Escape');
	await expect(page.locator('html.dark')).toHaveCount(1);
	await page.screenshot({
		path: 'test-results/editorial-home-it-mobile-dark.png',
		fullPage: true
	});
	await page.goto('/faq', { waitUntil: 'domcontentloaded' });
	await expect(page.getByRole('heading', { name: 'Questions about Ace Blocker' })).toBeVisible();
	await page.screenshot({ path: 'test-results/editorial-faq-en-mobile.png', fullPage: true });
});
