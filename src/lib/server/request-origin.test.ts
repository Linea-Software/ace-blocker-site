import { describe, expect, it } from 'vitest';
import { canonicalRequest } from './request-origin';
describe('configured public origin behind reverse proxy', () => {
	it('restores HTTPS without trusting forwarding headers, preserves POST body', async () => {
		const request = new Request('http://aceblocker.com/api/device-link/approve?q=1', {
			method: 'POST',
			body: '{"code":"fixture"}',
			headers: {
				'x-forwarded-host': 'evil.invalid',
				'x-forwarded-proto': 'http',
				origin: 'https://aceblocker.com'
			}
		});
		const result = canonicalRequest(request, 'https://aceblocker.com')!;
		expect(result.url).toBe('https://aceblocker.com/api/device-link/approve?q=1');
		expect(result.method).toBe('POST');
		expect(await result.text()).toBe('{"code":"fixture"}');
		expect(result.headers.get('origin')).toBe('https://aceblocker.com');
	});
	it('rejects an unconfigured host even with forged forwarding headers', () => {
		expect(
			canonicalRequest(
				new Request('http://evil.invalid/', {
					headers: { 'x-forwarded-host': 'aceblocker.com' }
				}),
				'https://aceblocker.com'
			)
		).toBeNull();
	});
});
