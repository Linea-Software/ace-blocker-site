import { expect, test, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';

const origin = process.env.ACE_E2E_BASE_URL!;
const password = 'visual-fixture-password';
const publicPaths = [
	'/',
	'/about',
	'/faq',
	'/download',
	'/features/network-blocks',
	'/features/resistance',
	'/get-pro',
	'/privacy',
	'/terms',
	'/connect',
	'/signin',
	'/signup',
	'/forgot-password'
];

async function capture(page: Page, path: string, state: string, title?: string) {
	const name = path.replace(/^\//, '').replace(/[^\w-]+/g, '-') || 'home';
	for (const width of [1440, 390]) {
		await page.setViewportSize({ width, height: 900 });
		await page.goto(path, { waitUntil: 'load' });
		if (title) await expect(page).toHaveTitle(title);
		await expect(page.locator('main').first()).toBeVisible();
		await page.evaluate(() => document.fonts.ready);
		for (const theme of ['light', 'dark']) {
			await page.evaluate((theme) => {
				document.documentElement.classList.toggle('dark', theme === 'dark');
				document.documentElement.style.colorScheme = theme;
				localStorage.setItem('mode', theme);
			}, theme);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth),
				path + ' ' + width
			).toBeLessThanOrEqual(width + 1);
			await page.screenshot({
				path:
					'test-results/visual-routes/' +
					state +
					'-' +
					name +
					'-' +
					width +
					'-' +
					theme +
					'.png',
				animations: 'disabled'
			});
		}
	}
}

async function signIn(page: Page, role: 'user' | 'admin') {
	const email = 'visual-' + randomUUID() + '@example.invalid';
	await page.goto('/signup');
	await page.fill('#name', 'Visual Fixture');
	await page.fill('#email', email);
	await page.fill('#password', password);
	await page.fill('#confirm-password', password);
	await page.getByRole('button', { name: /sign up/i }).click();
	await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
	const database = process.env.DATABASE_URL!;
	expect(process.env.ACE_E2E_ISOLATED).toBe('1');
	expect(new URL(database).hostname).toBe('127.0.0.1');
	expect(new URL(database).pathname).toBe('/ace_e2e');
	const sql = postgres(database);
	let id: string;
	try {
		const rows =
			await sql`update "user" set email_verified=true, role=${role} where email=${email} returning id`;
		expect(rows).toHaveLength(1);
		id = rows[0].id;
	} finally {
		await sql.end();
	}
	await page.goto('/signin');
	await page.fill('#email', email);
	await page.fill('#password', password);
	await page.getByRole('button', { name: /sign in/i }).click();
	await expect(page).toHaveURL(origin + '/');
	return id;
}

test.beforeEach(async ({ page }) => {
	await page.route(/^https:\/\/(?!127\.0\.0\.1:)/, (route) => route.abort());
});

test('public route screenshots in both themes and viewport classes', async ({ page }) => {
	test.setTimeout(90_000);
	for (const path of publicPaths) await capture(page, path, 'guest');
});

test('authenticated Free and Pro pages, role guard and completed checkout', async ({ page }) => {
	test.setTimeout(90_000);
	const id = await signIn(page, 'user');
	await capture(page, '/account', 'free');
	await capture(page, '/get-pro', 'free');
	await capture(page, '/connect', 'free');
	const denied = await page.request.get('/admin/users', { maxRedirects: 0 });
	expect(denied.status()).toBe(303);
	const sql = postgres(process.env.DATABASE_URL!);
	try {
		await sql`insert into pro_status (id,user_id,expiration,cached_at) values (${randomUUID()},${id}, now() + interval '30 days', now()) on conflict(user_id) do update set expiration=excluded.expiration,cached_at=excluded.cached_at`;
	} finally {
		await sql.end();
	}
	await capture(page, '/account', 'pro');
	await capture(page, '/get-pro', 'pro');
	await capture(page, '/checkout/completed', 'pro');
});

test('administrator route screenshots and data loaders', async ({ page }) => {
	test.setTimeout(90_000);
	await signIn(page, 'admin');
	for (const [path, title] of [
		['/admin/dashboard', 'Metrics — Ace Blocker Admin'],
		['/admin/users', 'Users — Ace Blocker Admin'],
		['/admin/releases/installers', 'Engine Installers — Ace Blocker Admin'],
		['/admin/releases/resistance', 'Resistance Mode Scripts — Ace Blocker Admin'],
		['/admin/releases/site-packs', 'Site Packs — Ace Blocker Admin']
	])
		await capture(page, path, 'admin', title);
});
