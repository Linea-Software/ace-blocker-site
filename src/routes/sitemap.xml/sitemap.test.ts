import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('sitemap', () => {
	it('includes each public locale and only indexable pages', async () => {
		const response = await GET({} as never);
		expect(response).toBeInstanceOf(Response);
		const xml = await (response as Response).text();
		expect(xml).toContain('<loc>https://aceblocker.com/it/faq</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/download</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/it/download</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/it/privacy</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/de/download</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/de/terms</loc>');
		expect(xml).toContain('hreflang="x-default" href="https://aceblocker.com/faq"');
		expect(xml).not.toContain('/checkout');
		expect(xml).not.toContain('/admin');
		expect(xml).not.toContain('/signin');
		expect((xml.match(/<url>/g) ?? []).length).toBe(22);
	});
});
