import { expect, test } from '@playwright/test';

test.describe('Network Block marketing walkthrough', () => {
	test('content → schedule → review → final policy, then lock', async ({ page }) => {
		await page.goto('/features/network-blocks', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('network-demo');
		await expect(demo.getByText('Choose what to block')).toBeVisible();
		await expect(demo.locator('.steps button').nth(1)).toBeDisabled();
		await expect(demo.locator('.steps button').nth(2)).toBeDisabled();
		await demo.getByRole('checkbox', { name: 'Social platforms' }).check();
		await demo.locator('#demo-domain').fill('focus.example');
		await demo.getByRole('button', { name: 'Add', exact: true }).click();
		await expect(demo.getByText('focus.example')).toBeVisible();
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: /Scheduled/ }).click();
		await expect(demo.getByText('Days', { exact: true })).toBeVisible();
		await demo.locator('.day-picker label').nth(0).click();
		await demo.locator('.wizard-footer button').last().click();
		await expect(demo.getByText('focus.example')).toBeVisible();
		await expect(demo.getByText('Mon–Fri, 09:00–17:00')).toHaveCount(0);
		await demo.getByRole('button', { name: 'Create block' }).click();
		await expect(demo.getByText('Created Network Block')).toBeVisible();
		const enabled = demo.getByRole('switch', { name: 'Enabled' });
		await expect(enabled).toHaveAttribute('aria-checked', 'true');
		await demo.getByRole('button', { name: 'Protect with lock' }).click();
		await expect(demo.locator('.lock-seal strong')).toHaveText('Lock active');
		await expect(enabled).toBeDisabled();
		await expect(demo.getByRole('button', { name: 'Edit' })).toBeDisabled();
	});

	test('play pauses on manual interaction; next/previous/replay are available', async ({
		page
	}) => {
		await page.goto('/features/network-blocks', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('network-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
		await expect(demo.locator('.guide-active')).toHaveCount(1);
		await expect(demo.locator('.demo-pointer')).toBeVisible();
		await demo.getByRole('checkbox', { name: 'Social platforms' }).uncheck();
		await expect(demo.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
		const progressBefore = await demo.locator('.progress').textContent();
		await demo.getByRole('button', { name: 'Next', exact: true }).last().click();
		await expect(demo.locator('.progress')).not.toHaveText(progressBefore ?? '');
		await demo.getByRole('button', { name: 'Previous' }).click();
		await expect(demo.locator('.progress')).toHaveText(progressBefore ?? '');
		await demo.getByRole('button', { name: 'Replay' }).click();
		await expect(demo.getByRole('button', { name: 'Pause' })).toBeVisible();
		await demo.getByRole('button', { name: 'Pause' }).click();
	});

	test('all schedule weekdays off cannot be saved', async ({ page }) => {
		await page.goto('/features/network-blocks', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('network-demo');
		await demo.getByRole('checkbox', { name: 'Social platforms' }).check();
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: /Scheduled/ }).click();
		for (let index = 0; index < 5; index++) {
			await demo.locator('.day-picker label').nth(index).click();
		}
		await expect(demo.locator('.wizard-footer button').last()).toBeDisabled();
	});
});

test.describe('Resistance marketing walkthrough', () => {
	test('all sections start collapsed and CAPTCHA unchecked', async ({ page }) => {
		await page.goto('/features/resistance', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('resistance-demo');
		await expect(demo.locator('.category')).toHaveCount(5);
		await expect(demo.locator('.disclosure[aria-expanded="false"]')).toHaveCount(5);
		await expect(
			demo.getByRole('checkbox', { name: 'Select all in Verifications (CAPTCHA)' })
		).not.toBeChecked();
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toHaveCount(0);
	});

	test('group checkbox acts without opening, individual site checkboxes become mixed', async ({
		page
	}) => {
		await page.goto('/features/resistance', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('resistance-demo');
		const feeds = demo.getByTestId('category-feeds');
		const checkbox = feeds.getByRole('checkbox', {
			name: 'Select all in Feeds and suggestions'
		});
		await checkbox.check();
		await expect(feeds.locator('.disclosure')).toHaveAttribute('aria-expanded', 'false');
		await expect(demo.getByText('Suggestions hidden')).toBeVisible();
		await feeds.locator('.disclosure').click();
		await feeds.getByRole('button', { name: /reddit.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide recommendations' }).uncheck();
		await expect(checkbox).toHaveJSProperty('indeterminate', true);
		await expect(demo.getByText('Suggestions hidden')).toBeVisible();
		await feeds.getByRole('button', { name: /x.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide trending topics' }).uncheck();
		await expect(demo.getByText('Suggestions hidden')).toHaveCount(0);
	});

	test('CAPTCHA selection changes only the simulated after view', async ({ page }) => {
		await page.goto('/features/resistance', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('resistance-demo');
		const captcha = demo.getByRole('checkbox', {
			name: 'Select all in Verifications (CAPTCHA)'
		});
		await captcha.check();
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toBeVisible();
		await captcha.uncheck();
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toHaveCount(0);
	});

	test('manual selection stops walkthrough and pointer is not interactive', async ({ page }) => {
		await page.goto('/features/resistance', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.getByRole('button', { name: 'Pause' })).toBeVisible();
		await demo.getByRole('checkbox', { name: 'Select all in Visual stimulation' }).check();
		await expect(demo.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
		await expect(demo.getByText('0 of 5')).toBeVisible();
	});

	test('responsive and reduced motion keep content accessible', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await page.goto('/features/resistance', { waitUntil: 'networkidle' });
		await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
		expect(
			await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
		).toBe(true);
		await page.getByRole('checkbox', { name: 'Select all in Feeds and suggestions' }).focus();
		expect(await page.locator(':focus-visible').count()).toBeGreaterThan(0);
	});
});

test('localized feature routes expose translated titles and content', async ({ page }) => {
	for (const locale of ['it', 'de', 'es']) {
		await page.goto('/' + locale + '/features/network-blocks');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
		await page.goto('/' + locale + '/features/resistance');
		await expect(page.locator('h1')).toBeVisible();
		await expect(page.locator('html')).toHaveAttribute('lang', locale);
	}
});
