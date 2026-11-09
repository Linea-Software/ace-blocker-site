import { describe, expect, it } from 'vitest';
import { GET } from './+server';
import { INDEXABLE_PATHS, localesForPath } from '$lib/seo';

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
		expect(xml).toContain('<loc>https://aceblocker.com/es/download</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/es/privacy</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/es/terms</loc>');
		expect(xml).toContain('hreflang="x-default" href="https://aceblocker.com/faq"');
		expect(xml).not.toContain('/checkout');
		expect(xml).not.toContain('/admin');
		expect(xml).not.toContain('/signin');
		expect(xml).toContain('<loc>https://aceblocker.com/features/network-blocks</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/it/features/resistance</loc>');
		expect(xml).toContain('<loc>https://aceblocker.com/de/features/resistance</loc>');
		const expectedUrls = INDEXABLE_PATHS.reduce(
			(sum, path) => sum + localesForPath(path).length,
			0
		);
		expect((xml.match(/<url>/g) ?? []).length).toBe(expectedUrls);
	});
});
