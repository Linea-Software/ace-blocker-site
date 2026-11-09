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
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toHaveCount(0);
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
		await expect(
			demo.locator('.mock-site.after [data-testid="reddit-suggestions"]')
		).toHaveCount(0);
		await feeds.locator('.disclosure').click();
		await feeds.getByRole('button', { name: /reddit.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide recommendations' }).uncheck();
		await expect(checkbox).toHaveJSProperty('indeterminate', true);
		// The preview is scoped to Reddit; X's still-selected rule must
		// not change this site's mock content.
		await expect(demo.getByTestId('resistance-preview-site')).toHaveValue('reddit.com');
		await expect(
			demo.locator('.mock-site.after [data-testid="reddit-suggestions"]')
		).toBeVisible();
		await feeds.getByRole('button', { name: /x.com/ }).click();
		await feeds.getByRole('checkbox', { name: 'Hide trending topics' }).uncheck();
		await expect(checkbox).not.toBeChecked();
		await expect(demo.getByTestId('resistance-preview-site')).toHaveValue('x.com');
		await expect(demo.locator('.mock-site.after [data-testid="x-trends"]')).toBeVisible();
	});

	test('Reddit grayscale includes the logo, controls and avatars, not only its feed', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const before = demo.locator('.mock-site:not(.after) [data-testid="site-replica"]');
		const after = demo.locator('.mock-site.after [data-testid="site-replica"]');
		await expect(after).not.toHaveClass(/grayscale-all/);
		await demo.getByRole('checkbox', { name: 'Select all in Visual stimulation' }).check();
		await expect(after).toHaveClass(/grayscale-all/);
		await expect(before).not.toHaveClass(/grayscale-all/);
		await expect(after.locator('.reddit-logo')).toBeVisible();
		await expect(after.locator('.reddit-login')).toBeVisible();
		await expect(after.locator('.community-avatar').first()).toBeVisible();
		expect(await after.evaluate((element) => getComputedStyle(element).filter)).toBe(
			'grayscale(1)'
		);
		await demo.getByTestId('resistance-preview-site').selectOption('x.com');
		await expect(after).not.toHaveClass(/grayscale-all/);
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
		await expect(
			demo.locator('.mock-site.after [data-testid="youtube-video"]')
		).toHaveAttribute('data-quality', 'low');
		await site.selectOption('reddit.com');
		await expect(demo.locator('.mock-site.after [data-testid="youtube-video"]')).toHaveCount(0);

		await demo.getByRole('checkbox', { name: 'Select all in Verifications (CAPTCHA)' }).check();
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toBeVisible();
		await site.selectOption('netflix.com');
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toHaveCount(0);

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
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toBeVisible();
		await captcha.uncheck();
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toHaveCount(0);
	});

	test('pointer selects YouTube before the YouTube interventions appear', async ({ page }) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const site = demo.getByTestId('resistance-preview-site');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		const videos = demo.getByRole('checkbox', {
			name: 'Select all in Videos and playback'
		});
		await expect(videos).not.toBeChecked();
		// The cursor must visibly travel to the website selector while Reddit is still shown.
		await expect(demo.locator('[data-demo-pointer-target="preview-site"]')).toBeVisible({
			timeout: 6000
		});
		await expect(site).toHaveValue('reddit.com');
		await expect(site).toHaveValue('youtube.com', { timeout: 3500 });
		await expect(demo.getByText('2 of 6')).toBeVisible();
		await expect(
			demo.locator('.mock-site.after [data-testid="youtube-video"]')
		).toHaveAttribute('data-quality', 'normal');
		await expect(
			demo.locator('.mock-site.after [data-testid="youtube-video"]')
		).toHaveAttribute('data-quality', 'low', { timeout: 5000 });
		await expect(videos).toBeChecked();
	});

	test('guided CAPTCHA pointer clicks the checkbox, spins, and completes', async ({ page }) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.locator('[data-demo-pointer-target="captcha-checkbox"]')).toBeVisible({
			timeout: 16000
		});
		const spinner = demo.locator('.mock-site.after [data-testid="captcha-spinner"]');
		await expect(spinner).toBeVisible({ timeout: 4000 });
		expect(await spinner.evaluate((el) => getComputedStyle(el).animationName)).toMatch(/spin$/);
		await expect(demo.locator('.mock-site.after [data-testid="mock-captcha"]')).toHaveCount(0, {
			timeout: 5000
		});
		await expect(demo.getByText('6 of 6')).toBeVisible();
	});

	test('scroll limit prevents the Reddit feed going past the cap', async ({ page }) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('checkbox', { name: 'Select all in Delays and limits' }).check();
		const before = demo.locator(
			'.mock-site:not(.after) [data-testid="reddit-scroll-viewport"]'
		);
		const after = demo.locator('.mock-site.after [data-testid="reddit-scroll-viewport"]');
		await before.evaluate((el: HTMLElement) => (el.scrollTop = el.scrollHeight));
		await after.evaluate((el: HTMLElement) => (el.scrollTop = el.scrollHeight));
		await expect
			.poll(() =>
				after.evaluate((el: HTMLElement) => el.scrollTop <= el.clientHeight * 1.5 + 1)
			)
			.toBe(true);
		await expect(demo.locator('.mock-site.after .scroll-edge')).toBeVisible();
		expect(
			await before.evaluate((el: HTMLElement) => el.scrollTop > el.clientHeight * 1.5)
		).toBe(true);
	});

	test('YouTube playback continues while its audio starts two seconds later', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('checkbox', { name: 'Select all in Delays and limits' }).check();
		await demo.getByTestId('resistance-preview-site').selectOption('youtube.com');
		const after = demo.locator('.mock-site.after');
		await after.getByTestId('youtube-video').click();
		await expect(after.getByTestId('youtube-audio')).toHaveAttribute('data-ready', 'false');
		await expect(after.getByTestId('youtube-audio')).toHaveAttribute('data-ready', 'true', {
			timeout: 4500
		});
	});

	test('CAPTCHA has a checkbox with verification progress and can be completed', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('checkbox', { name: 'Select all in Verifications (CAPTCHA)' }).check();
		const after = demo.locator('.mock-site.after');
		await expect(after.getByTestId('mock-captcha')).toBeVisible();
		await after.getByTestId('captcha-checkbox').click();
		await expect(after.getByTestId('mock-captcha')).toHaveCount(0, { timeout: 5000 });
	});

	test('manual selection stops walkthrough and pointer is not interactive', async ({ page }) => {
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(demo.getByRole('button', { name: 'Pause' })).toBeVisible();
		await demo.getByRole('checkbox', { name: 'Select all in Visual stimulation' }).check();
		await expect(demo.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
		await expect(demo.getByText('0 of 6')).toBeVisible();
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
