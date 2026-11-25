import { expect, test } from '@playwright/test';

test.use({ locale: 'en-US', timezoneId: 'Europe/Rome' });

test('English browser in Italy uses EUR without an edge country and preserves checkout currency', async ({
	page
}) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/get-pro', { waitUntil: 'networkidle' });
	await expect(page.getByText('€24,99', { exact: true })).toBeVisible();
	await expect(page.getByText('$24.99', { exact: true })).toHaveCount(0);
	await page.getByRole('button', { name: 'Start 14-day free trial' }).click();
	await expect(page).toHaveURL(/\/signin\?/);
	expect(new URL(page.url()).searchParams.get('redirectTo')).toContain('currency=EUR');
	expect(errors).toEqual([]);
});

test('trusted edge location wins over browser time zone', async ({ page }) => {
	await page.setExtraHTTPHeaders({ 'x-ace-visitor-country': 'GB' });
	await page.goto('/get-pro', { waitUntil: 'networkidle' });
	await expect(page.getByText('£24.99', { exact: true })).toBeVisible();
	await expect(page.getByText('€24,99', { exact: true })).toHaveCount(0);
});

test('explicit currency survives reload', async ({ page }) => {
	await page.goto('/get-pro?currency=USD', { waitUntil: 'networkidle' });
	await expect(page.getByText('$24.99', { exact: true })).toBeVisible();
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByText('$24.99', { exact: true })).toBeVisible();
});

test('regional pricing also resolves after client-side navigation', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (error) => errors.push(error.message));
	await page.goto('/', { waitUntil: 'networkidle' });
	await page.locator('header a[href="/get-pro"]').click();
	await expect(page).toHaveURL(/\/get-pro$/);
	await expect(page.getByText('€24,99', { exact: true })).toBeVisible();
	expect(errors).toEqual([]);
});
