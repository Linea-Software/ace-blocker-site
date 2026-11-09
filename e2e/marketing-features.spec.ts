import { expect, test, type Page } from '@playwright/test';

async function openReadyDemo(
	page: Page,
	route: '/features/network-blocks' | '/features/resistance'
) {
	await page.goto(route, { waitUntil: 'domcontentloaded' });
	const testId = route === '/features/network-blocks' ? 'network-demo' : 'resistance-demo';
	await expect(page.getByTestId(testId)).toHaveAttribute('data-demo-ready', 'true', {
		timeout: 15_000
	});
}

test.describe('Network Block marketing walkthrough', () => {
	test('content → schedule → review → final policy, then lock', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
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
		await demo.getByRole('button', { name: 'Lock', exact: true }).click();
		await expect(demo.getByText('Choose a lock')).toBeVisible();
		await expect(enabled).toBeEnabled(); // Opening the dialog does not lock anything.
		await demo.getByRole('button', { name: /Until a date/ }).click();
		await demo.getByRole('button', { name: 'Review lock' }).click();
		await expect(demo.getByText(/cannot be weakened before/)).toBeVisible();
		await expect(enabled).toBeEnabled();
		await demo.getByRole('button', { name: 'Apply lock' }).click();
		await expect(demo.locator('.lock-seal strong')).toHaveText('Lock active');
		await expect(enabled).toBeDisabled();
		await expect(demo.getByRole('button', { name: 'View' })).toBeEnabled();
		await demo.getByRole('button', { name: 'View' }).click();
		await expect(demo.getByText('Protection: Until a date')).toBeVisible();
	});

	test('play pauses on manual interaction; next/previous/replay are available', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		const social = demo.getByRole('checkbox', { name: 'Social platforms' });
		await expect(social).not.toBeChecked();
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
		await expect(demo.locator('.demo-pointer')).toBeVisible();
		// The separate pointer-motion test checks the sub-second phases.
		// Avoid checking a 680 ms transient after multiple awaited DOM assertions.
		await expect(social).toBeChecked({ timeout: 3500 });
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

	test('pointer actually travels and the checked state follows the click', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		const cursor = demo.locator('.demo-pointer');
		const checkbox = demo.getByRole('checkbox', { name: 'Social platforms' });
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		const origin = await cursor.boundingBox();
		await page.waitForTimeout(300);
		const midpoint = await cursor.boundingBox();
		expect(origin).not.toBeNull();
		expect(midpoint).not.toBeNull();
		expect(
			Math.hypot((midpoint?.x ?? 0) - (origin?.x ?? 0), (midpoint?.y ?? 0) - (origin?.y ?? 0))
		).toBeGreaterThan(16);
		await expect(checkbox).not.toBeChecked();
		await expect(checkbox).toBeChecked({ timeout: 2800 });
		await expect(cursor).toBeVisible();
	});

	test('guided network sequence configures the lock only after the pointer clicks confirmation', async ({
		page
	}) => {
		test.setTimeout(45_000);
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.locator('.lock-config')).toBeVisible({ timeout: 24_000 });
		await expect(demo.locator('.lock-seal')).toHaveCount(0);
		await expect(demo.getByText(/cannot be weakened before/)).toBeVisible({ timeout: 10_000 });
		await expect(demo.locator('.lock-seal')).toBeVisible({ timeout: 10_000 });
		await expect(demo.locator('.demo-pointer')).toBeVisible();
		await expect(demo.getByRole('switch', { name: 'Enabled' })).toBeDisabled();
		await expect(demo.getByRole('button', { name: 'View' })).toBeEnabled();
	});

	test('all schedule weekdays off cannot be saved', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
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
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await expect(demo.locator('.category')).toHaveCount(5);
		await expect(demo.locator('.disclosure[aria-expanded="false"]')).toHaveCount(5);
		await expect(
			demo.getByRole('checkbox', { name: 'Select all in Feeds and suggestions' })
		).toBeChecked();
		await expect(
			demo.getByRole('checkbox', { name: 'Select all in Videos and playback' })
		).toBeChecked();
		await expect(
			demo.getByRole('checkbox', { name: 'Select all in Verifications (CAPTCHA)' })
		).not.toBeChecked();
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toHaveCount(0);
	});

	test('group checkbox acts without opening, individual site checkboxes become mixed', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const feeds = demo.getByTestId('category-feeds');
		const checkbox = feeds.getByRole('checkbox', {
			name: 'Select all in Feeds and suggestions'
		});
		await checkbox.uncheck();
		await checkbox.check();
		await expect(feeds.locator('.disclosure')).toHaveAttribute('aria-expanded', 'false');
		await expect(demo.getByText('Suggestions hidden')).toBeVisible();
		await feeds.locator('.disclosure').click();
		await feeds.getByRole('button', { name: /reddit.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide recommendations' }).uncheck();
		await expect(checkbox).toHaveJSProperty('indeterminate', true);
		// The preview is scoped to Reddit; X's still-selected rule must
		// not change this site's mock content.
		await expect(demo.getByTestId('resistance-preview-site')).toHaveValue('reddit.com');
		await expect(demo.getByText('Suggestions hidden')).toHaveCount(0);
		await feeds.getByRole('button', { name: /x.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide trending topics' }).uncheck();
		await expect(checkbox).not.toBeChecked();
		await expect(demo.getByText('Suggestions hidden')).toHaveCount(0);
	});

	test('site-scoped preview shows only matching effects and usable mobile before/after', async ({
		page
	}) => {
		await page.setViewportSize({ width: 320, height: 800 });
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const site = demo.getByTestId('resistance-preview-site');
		const before = demo.getByRole('button', { name: 'Before', exact: true });
		const after = demo.getByRole('button', { name: 'After', exact: true });
		await expect(before).toBeVisible();
		await expect(after).toBeVisible();

		await site.selectOption('youtube.com');
		await demo.getByRole('checkbox', { name: 'Select all in Visual stimulation' }).check();
		await expect(demo.getByText('Video quality reduced', { exact: false })).toBeVisible();
		await site.selectOption('reddit.com');
		await expect(demo.getByText('Video quality reduced', { exact: false })).toHaveCount(0);

		await demo.getByRole('checkbox', { name: 'Select all in Verifications (CAPTCHA)' }).check();
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toBeVisible();
		await site.selectOption('netflix.com');
		await expect(demo.getByText('Simulated CAPTCHA — not a real challenge')).toHaveCount(0);

		await before.click();
		await expect(before).toHaveAttribute('aria-pressed', 'true');
		await expect(demo.locator('.mock-site').first()).toBeVisible();
		await expect(demo.locator('.mock-site').last()).not.toBeVisible();
		await after.click();
		await expect(demo.locator('.mock-site').last()).toBeVisible();
	});

	test('CAPTCHA selection changes only the simulated after view', async ({ page }) => {
		await openReadyDemo(page, '/features/resistance');
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
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.getByRole('button', { name: 'Pause' })).toBeVisible();
		await demo.getByRole('checkbox', { name: 'Select all in Visual stimulation' }).check();
		await expect(demo.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
		await expect(demo.getByText('0 of 4')).toBeVisible();
	});

	test('responsive and reduced motion keep content accessible', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.emulateMedia({ reducedMotion: 'reduce' });
		await openReadyDemo(page, '/features/resistance');
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
