import { describe, expect, it } from 'vitest';
import { allowedAuthReturn } from './auth-return';
describe('sign-in destination', () => {
	it.each(['', '/it', '/de', '/es'])('preserves checkout and device routes for %s', (prefix) => {
		const checkout = prefix + '/checkout?cycle=monthly&currency=EUR';
		const connect = prefix + '/connect?code=ABCD-EFGH-JKLM';
		expect(allowedAuthReturn(checkout)).toBe(checkout);
		expect(allowedAuthReturn(connect)).toBe(connect);
		expect(allowedAuthReturn(prefix + '/checkout')).toBe(prefix + '/checkout');
	});
	it.each([
		'https://evil.invalid/checkout',
		'//evil.invalid/checkout',
		'/\\evil.invalid/checkout',
		'/checkout#secret',
		'/connect?code=invalid',
		'/connect?code=ABCD-EFGH-JKLM&deviceCode=secret',
		'/admin',
		'/checkout-other'
	])('rejects %s', (candidate) => {
		expect(allowedAuthReturn(candidate)).toBeNull();
	});
});
