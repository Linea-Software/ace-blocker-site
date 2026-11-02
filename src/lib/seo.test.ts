import { describe, expect, it } from 'vitest';
import { alternateUrls, basePath, canonicalUrl, isIndexablePage, localizedPath } from './seo';

describe('SEO URL helpers', () => {
	it('uses the public domain and preserves locale without query strings', () => {
		expect(canonicalUrl('/it/about')).toBe('https://aceblocker.com/it/about');
		expect(canonicalUrl('/')).toBe('https://aceblocker.com/');
	});
	it('localizes paths consistently with reciprocal alternates', () => {
		expect(basePath('/de/download/')).toBe('/download');
		expect(localizedPath('/it/about', 'es')).toBe('/es/about');
		expect(alternateUrls('/about').map(({ locale }) => locale)).toEqual(['en']);
		expect(alternateUrls('/faq').map(({ locale }) => locale)).toEqual(['en', 'es', 'it', 'de']);
	});
	it('does not index private or unknown routes', () => {
		expect(isIndexablePage('/de/download')).toBe(false);
		expect(isIndexablePage('/de/faq')).toBe(true);
		expect(isIndexablePage('/es/signin')).toBe(false);
		expect(isIndexablePage('/checkout')).toBe(false);
		expect(isIndexablePage('/admin')).toBe(false);
		expect(isIndexablePage('/unknown')).toBe(false);
	});
});
