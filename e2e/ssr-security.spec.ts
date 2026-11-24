import { expect, test } from '@playwright/test';

test('document status, canonical metadata and private route guards', async ({ request }) => {
	for (const path of [
		'/',
		'/it',
		'/de/about',
		'/es/faq',
		'/features/network-blocks',
		'/features/resistance',
		'/download',
		'/get-pro',
		'/privacy',
		'/terms',
		'/signup',
		'/signin',
		'/forgot-password',
		'/connect'
	]) {
		const response = await request.get(path, {
			maxRedirects: 0,
			headers: { accept: 'text/html' }
		});
		expect(response.status(), path).toBe(200);
		expect(response.headers()['cache-control'], path).toContain('no-store');
		const html = await response.text();
		expect(html, path).toContain('<html');
	}
	for (const path of ['/no-such-page', '/it/no-such-page', '/dev/checkout', '/it/dev/checkout']) {
		expect((await request.get(path, { maxRedirects: 0 })).status(), path).toBe(404);
	}
	for (const path of [
		'/account',
		'/it/account',
		'/checkout?cycle=yearly',
		'/checkout/completed',
		'/admin/dashboard',
		'/it/admin/users'
	]) {
		const response = await request.get(path, { maxRedirects: 0 });
		expect(response.status(), path).toBe(303);
		expect(response.headers().location, path).toBeTruthy();
	}
	const sitemap = await request.get('/sitemap.xml');
	expect(sitemap.status()).toBe(200);
	expect(await sitemap.text()).toContain('https://aceblocker.com/it');
});
