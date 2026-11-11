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

	test('browser scene follows the lock and returns a simulated HTTP 404', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		const next = demo.locator('.walkthrough').getByRole('button', { name: 'Next' });
		const previous = demo.locator('.walkthrough').getByRole('button', { name: 'Previous' });

		for (let step = 0; step <= 9; step++) await next.click();
		await expect(demo.locator('.lock-seal')).toBeVisible();
		await expect(demo.getByRole('button', { name: 'Try opening the website' })).toBeVisible();

		await next.click(); // Open the simulated browser after protecting the rule.
		const browser = demo.getByTestId('blocked-browser-demo');
		await expect(browser).toBeVisible();
		await expect(browser.getByRole('button', { name: 'Browser address bar' })).toBeVisible();
		await expect(browser.getByText('404', { exact: true })).toHaveCount(0);

		await next.click(); // Type the domain.
		await expect(browser.getByText('https://example.com')).toBeVisible();
		await next.click(); // Navigate: loading, not yet blocked.
		await expect(browser.getByText('Loading website…')).toBeVisible();
		await next.click(); // Passive network response; no second click.
		await expect(browser.getByText('HTTP 404', { exact: true })).toBeVisible();
		await expect(browser.getByRole('heading', { name: 'Not Found' })).toBeVisible();

		await previous.click();
		await expect(browser.getByText('Loading website…')).toBeVisible();
		await browser.getByRole('button', { name: 'Back to rule' }).click();
		await expect(browser).toHaveCount(0);
		await demo.getByRole('button', { name: 'Replay' }).click();
		await expect(demo.getByText('Choose what to block')).toBeVisible();
	});

	test('manual browser navigation shows 404 only after the request', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		const next = demo.locator('.walkthrough').getByRole('button', { name: 'Next' });
		for (let step = 0; step <= 9; step++) await next.click();

		await demo.getByRole('button', { name: 'Try opening the website' }).click();
		const browser = demo.getByTestId('blocked-browser-demo');
		await browser.getByRole('button', { name: 'Browser address bar' }).click();
		await browser.getByRole('button', { name: 'Open website' }).click();
		await expect(browser.getByText('Loading website…')).toBeVisible();
		await expect(browser.getByText('HTTP 404', { exact: true })).toBeVisible({ timeout: 3500 });
		await expect(demo.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
	});

	test('out-of-schedule manual browser preview does not claim a 404 block', async ({ page }) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		await demo.locator('#demo-domain').fill('example.com');
		await demo.getByRole('button', { name: 'Add', exact: true }).click();
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: /Scheduled/ }).click();
		await demo.locator('.day-picker label').first().click(); // Monday is off.
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: 'Create block' }).click();
		await demo.getByRole('button', { name: 'Try opening the website' }).click();
		const browser = demo.getByTestId('blocked-browser-demo');
		await browser.getByRole('button', { name: 'Browser address bar' }).click();
		await browser.getByRole('button', { name: 'Open website' }).click();
		await expect(browser.getByRole('heading', { name: 'Website not blocked' })).toBeVisible({
			timeout: 3500
		});
		await expect(browser.getByText('HTTP 404', { exact: true })).toHaveCount(0);
	});

	test('guided browser preview enters the address before showing the HTTP response', async ({
		page
	}) => {
		await openReadyDemo(page, '/features/network-blocks');
		const demo = page.getByTestId('network-demo');
		const next = demo.locator('.walkthrough').getByRole('button', { name: 'Next' });
		for (let step = 0; step <= 9; step++) await next.click();

		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		const browser = demo.getByTestId('blocked-browser-demo');
		await expect(browser).toBeVisible({ timeout: 5000 });
		await expect(browser.getByText('https://example.com')).toBeVisible({ timeout: 5500 });
		await expect(browser.getByText('Loading website…')).toBeVisible({ timeout: 6000 });
		await expect(browser.getByText('HTTP 404', { exact: true })).toBeVisible({ timeout: 5000 });
		await expect(demo.locator('.demo-pointer')).toHaveCount(0);
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

test.describe('Resistance layout and responsiveness', () => {
	test('Get Pro keeps compact Resistance labels inside their controls', async ({ page }) => {
		for (const width of [390, 1366, 1920]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/get-pro', { waitUntil: 'networkidle' });
			const demo = page.getByTestId('resistance-demo');
			await expect(demo).toBeVisible();
			const toggle = demo.getByRole('button', { name: 'Choose the interventions' });

			if (await toggle.isVisible()) {
				await expect(toggle).toHaveAttribute('aria-expanded', 'false');
				await expect(demo.locator('.preview')).toBeVisible();
				await toggle.click();
				await expect(toggle).toHaveAttribute('aria-expanded', 'true');
			}

			await expect(demo.getByTestId('category-captcha')).toBeVisible();
			const measurements = await demo.locator('.category').evaluateAll((categories) =>
				categories.map((category) => {
					const disclosure = category.querySelector<HTMLElement>('.disclosure');
					const copy = category.querySelector<HTMLElement>('.category-copy');
					return {
						categoryWidth: category.clientWidth,
						categoryScrollWidth: category.scrollWidth,
						disclosureWidth: disclosure?.clientWidth ?? 0,
						disclosureScrollWidth: disclosure?.scrollWidth ?? 0,
						copyWidth: copy?.getBoundingClientRect().width ?? 0
					};
				})
			);
			expect(measurements).toHaveLength(5);
			for (const item of measurements) {
				expect(
					item.categoryScrollWidth,
					`category overflow at ${width}px`
				).toBeLessThanOrEqual(item.categoryWidth + 1);
				expect(
					item.disclosureScrollWidth,
					`label overflow at ${width}px`
				).toBeLessThanOrEqual(item.disclosureWidth + 1);
				expect(item.copyWidth, `zero-width category text at ${width}px`).toBeGreaterThan(
					65
				);
			}
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth),
				`page overflow at ${width}px`
			).toBeLessThanOrEqual(width);
		}
	});

	test('homepage gives the website preview most of the width', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await page.goto('/', { waitUntil: 'networkidle' });
		const section = page.locator('section[aria-labelledby="home-resistance"]');
		await expect(
			section.getByRole('heading', { name: 'Make websites less distracting' })
		).toBeVisible();
		const demo = section.getByTestId('resistance-demo');
		const preview = await demo.locator('.preview').boundingBox();
		const groups = await demo.locator('.groups').boundingBox();
		expect(preview).not.toBeNull();
		expect(groups).not.toBeNull();
		expect(preview!.width / (preview!.width + groups!.width)).toBeGreaterThan(0.69);
		await expect(demo.getByRole('button', { name: 'Before' })).toBeVisible();
		await expect(demo.getByRole('button', { name: 'After' })).toBeVisible();
	});

	test('the feature page preserves two wide comparison sites on desktop', async ({ page }) => {
		await page.setViewportSize({ width: 1440, height: 900 });
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const preview = await demo.locator('.preview').boundingBox();
		const groups = await demo.locator('.groups').boundingBox();
		expect(preview).not.toBeNull();
		expect(groups).not.toBeNull();
		expect(preview!.width / (preview!.width + groups!.width)).toBeGreaterThan(0.64);
		await expect(demo.locator('.mock-site')).toHaveCount(2);
		await expect(demo.locator('.mock-site').first()).toBeVisible();
		await expect(demo.locator('.mock-site').last()).toBeVisible();
	});

	test('mobile homepage controls start collapsed and remain usable', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await page.goto('/', { waitUntil: 'networkidle' });
		const demo = page.getByTestId('resistance-demo');
		const toggle = demo.getByRole('button', { name: 'Choose the interventions' });
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await expect(demo.getByTestId('category-feeds')).toBeHidden();
		await expect(demo.locator('.preview')).toBeVisible();

		await toggle.click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		const feeds = demo.getByTestId('category-feeds');
		await expect(feeds).toBeVisible();
		await feeds.getByRole('checkbox').uncheck();
		await expect(feeds.locator('.selection-count')).toHaveText('0/2');
		await toggle.click();
		await expect(feeds).toBeHidden();
		expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
			390
		);
	});

	test('the full mobile demo can collapse interventions without hiding the website', async ({
		page
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await openReadyDemo(page, '/features/resistance');
		const demo = page.getByTestId('resistance-demo');
		const toggle = demo.getByRole('button', { name: 'Choose the interventions' });
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await toggle.click();
		await expect(demo.getByTestId('category-video')).toBeHidden();
		await demo.getByTestId('resistance-preview-site').selectOption('youtube.com');
		await expect(demo.locator('[data-site="youtube.com"]')).toHaveCount(2);
		await expect(demo.locator('.mock-site.after')).toBeVisible();
		await expect(toggle).toHaveAttribute('aria-expanded', 'false');
		await demo.getByRole('button', { name: 'Play', exact: true }).click();
		await expect(toggle).toHaveAttribute('aria-expanded', 'true');
		await expect(demo.getByTestId('category-visual')).toBeVisible();
		await demo.getByRole('button', { name: 'Pause', exact: true }).click();
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

test.describe('Download page primary installer actions', () => {
	test('an explicit architecture URL selects the requested platform', async ({ page }) => {
		for (const [arch, platform] of [
			['windows_x64', 'Windows'],
			['macos_universal', 'macOS'],
			['linux_x64', 'Linux']
		]) {
			await page.goto(`/download?arch=${arch}`, { waitUntil: 'networkidle' });
			const card = page.getByTestId('primary-installer-card');
			await expect(card.getByRole('button', { name: platform, exact: true })).toHaveAttribute(
				'aria-pressed',
				'true'
			);
		}
	});

	test('download button and terminal command are in the same above-the-fold card', async ({
		page
	}) => {
		for (const width of [390, 768, 1440]) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto('/download', { waitUntil: 'networkidle' });
			const card = page.getByTestId('primary-installer-card');
			await expect(card).toBeVisible();
			const download = card.getByRole('button', { name: 'Download now' });
			const copy = card.getByRole('button', { name: /Copy .* installation command/ });
			await expect(download).toBeVisible();
			await expect(copy).toBeVisible();
			const downloadBox = await download.boundingBox();
			const copyBox = await copy.boundingBox();
			expect(downloadBox).not.toBeNull();
			expect(copyBox).not.toBeNull();
			expect(downloadBox!.y + downloadBox!.height).toBeLessThan(900);
			expect(copyBox!.y + copyBox!.height).toBeLessThan(900);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth)
			).toBeLessThanOrEqual(width);
		}
	});

	test('platform switcher updates both installation options without offering unavailable files', async ({
		page
	}) => {
		await page.goto('/download', { waitUntil: 'networkidle' });
		const card = page.getByTestId('primary-installer-card');
		for (const platform of ['Windows', 'macOS', 'Linux']) {
			const option = card.getByRole('button', { name: platform, exact: true });
			await option.click();
			await expect(option).toHaveAttribute('aria-pressed', 'true');
			const download = card.getByRole('button', { name: 'Download now' });
			const copy = card.getByRole('button', {
				name: `Copy ${platform} installation command`
			});
			await expect(copy).toBeVisible();
			const available = (await card.locator('pre code').count()) > 0;
			expect(await download.isEnabled()).toBe(available);
			expect(await copy.isEnabled()).toBe(available);
			if (available) {
				const command = await card.locator('pre code').innerText();
				const suffix =
					platform === 'Windows'
						? '/download/windows_'
						: platform === 'macOS'
							? '/download/macos_universal'
							: '/download/linux_';
				expect(command).toContain(suffix);
			} else {
				await expect(card.getByText('Not currently available').first()).toBeVisible();
			}
		}
	});
});
