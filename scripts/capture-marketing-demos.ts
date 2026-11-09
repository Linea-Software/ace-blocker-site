/**
 * Repeatable visual QA of the public marketing UI and interactive demo results.
 * Start the Ace site dev server, then: bun scripts/capture-marketing-demos.ts
 * Output remains local in the ignored test-results/marketing-demos directory.
 */
import { chromium, type Page } from 'playwright';
import { expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.MARKETING_VISUAL_ORIGIN ?? 'http://localhost:5173';
const directory = 'test-results/marketing-demos';
const routes = [
	'/',
	'/about',
	'/get-pro',
	'/faq',
	'/features/network-blocks',
	'/features/resistance'
];
const modes = ['light', 'dark'] as const;
const devices = [
	{ name: 'desktop', width: 1365, height: 900 },
	{ name: 'mobile', width: 390, height: 844 }
] as const;
type Report = {
	path: string;
	route: string;
	theme: string;
	device: string;
	phase: 'initial' | 'after';
	horizontalOverflow: boolean;
	browserErrors: string[];
};

const reports: Report[] = [];
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

async function screenshot(
	page: Page,
	route: string,
	device: string,
	theme: string,
	phase: 'initial' | 'after',
	errors: string[]
) {
	await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
	await page.waitForTimeout(120);
	const horizontalOverflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth
	);
	const slug = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
	const path =
		directory +
		'/' +
		slug +
		'-' +
		device +
		'-' +
		theme +
		(phase === 'after' ? '-after' : '') +
		'.png';
	await page.screenshot({ path, fullPage: true });
	reports.push({
		path,
		route,
		theme,
		device,
		phase,
		horizontalOverflow,
		browserErrors: [...errors]
	});
}

async function interact(page: Page, route: string) {
	if (route === '/features/network-blocks') {
		const demo = page.getByTestId('network-demo');
		const social = demo.getByRole('checkbox', { name: 'Social platforms' });
		const next = demo.locator('.wizard-footer button').last();
		await social.check();
		// In the dev server, initial hydration can finish after the first
		// browser-visible checkbox update. Retry only if Svelte state is
		// still not reflected in the wizard's Next button.
		for (let attempt = 0; attempt < 3 && (await next.isDisabled()); attempt++) {
			await page.waitForTimeout(600);
			await social.uncheck();
			await social.check();
		}
		await expect(next).toBeEnabled({ timeout: 10_000 });
		await demo.locator('#demo-domain').fill('focus.example');
		await demo.getByRole('button', { name: 'Add', exact: true }).click();
		await expect(demo.getByText('focus.example')).toBeVisible();
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: /Scheduled/ }).click();
		await expect(demo.locator('.wizard-footer button').last()).toBeEnabled();
		await demo.locator('.wizard-footer button').last().click();
		await demo.getByRole('button', { name: 'Create block' }).click();
		await demo.getByRole('button', { name: 'Lock', exact: true }).click();
		await demo.getByRole('button', { name: 'Review lock' }).click();
		await demo.getByRole('button', { name: 'Apply lock' }).click();
	} else if (route === '/features/resistance') {
		const demo = page.getByTestId('resistance-demo');
		for (const category of [
			'Feeds and suggestions',
			'Visual stimulation',
			'Verifications (CAPTCHA)'
		]) {
			await demo.getByRole('checkbox', { name: 'Select all in ' + category }).check();
		}
	}
}

try {
	for (const route of routes) {
		for (const device of devices) {
			for (const theme of modes) {
				const page = await browser.newPage({
					viewport: { width: device.width, height: device.height },
					colorScheme: theme
				});
				const errors: string[] = [];
				page.on('pageerror', (error) => errors.push(error.message));
				try {
					await page.goto(origin + route, {
						waitUntil: 'load',
						timeout: 20_000
					});
					await page.locator('main').waitFor({ state: 'attached', timeout: 10_000 });
					await page.waitForTimeout(850);
					// Use the actual theme control, not a transient class mutation:
					// mode-watcher can restore its chosen mode after hydration.
					const html = page.locator('html');
					const themeButton = page.getByRole('button', { name: 'Toggle theme' });
					for (let attempt = 0; attempt < 4; attempt++) {
						const isDark = await html.evaluate((element) =>
							element.classList.contains('dark')
						);
						if (isDark === (theme === 'dark')) break;
						await themeButton.click();
						await page.waitForTimeout(650);
					}
					if (theme === 'dark') {
						await expect(html).toHaveClass(/dark/);
					} else {
						await expect(html).not.toHaveClass(/dark/);
					}
					await screenshot(page, route, device.name, theme, 'initial', errors);
					if (route.startsWith('/features/')) {
						await interact(page, route);
						await screenshot(page, route, device.name, theme, 'after', errors);
					}
				} finally {
					await page.close();
				}
			}
		}
	}
} finally {
	await browser.close();
}

await writeFile(directory + '/report.json', JSON.stringify(reports, null, 2) + '\n');
console.log('Saved ' + reports.length + ' real browser screenshots in ' + directory);
const problematic = reports.filter(
	(entry) => entry.horizontalOverflow || entry.browserErrors.length
);
for (const issue of problematic) console.warn('Review:', issue);
if (problematic.length) process.exitCode = 1;
