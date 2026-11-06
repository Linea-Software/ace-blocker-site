import { describe, expect, it } from 'vitest';
import { languageSwitchHref } from './language-switch';

describe('website locale switching', () => {
	it('keeps the current page, query string and fragment', () => {
		expect(languageSwitchHref(new URL('https://aceblocker.com/about?q=1#more'), 'it')).toBe(
			'/it/about?q=1#more'
		);
		expect(
			languageSwitchHref(new URL('https://aceblocker.com/it/faq?mode=a#answer'), 'en')
		).toBe('/faq?mode=a#answer');
	});
	it('supports private routes without changing their meaning', () => {
		expect(languageSwitchHref(new URL('https://aceblocker.com/account'), 'it')).toBe(
			'/it/account'
		);
		expect(
			languageSwitchHref(new URL('https://aceblocker.com/it/checkout/completed'), 'en')
		).toBe('/checkout/completed');
	});
	it('switches to German on public and account pages without dropping parameters', () => {
		expect(
			languageSwitchHref(new URL('https://aceblocker.com/it/get-pro?cycle=yearly#plans'), 'de')
		).toBe('/de/get-pro?cycle=yearly#plans');
		expect(languageSwitchHref(new URL('https://aceblocker.com/de/about'), 'en')).toBe('/about');
		expect(
			languageSwitchHref(new URL('https://aceblocker.com/de/checkout/completed?status=ok'), 'it')
		).toBe('/it/checkout/completed?status=ok');
	});
});
