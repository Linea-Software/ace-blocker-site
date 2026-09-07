import { describe, expect, it } from 'vitest';
import { getSafeRequestPath } from './request-log';

describe('API request logging', () => {
	it('never includes query values in the logged path', () => {
		const sensitiveValue = 'should-not-appear-in-logs';
		const path = getSafeRequestPath(
			`https://aceblocker.com/api/auth/verify-email?code=${sensitiveValue}&callback=/account`
		);
		expect(path).toBe('/api/auth/verify-email');
		expect(path).not.toContain(sensitiveValue);
		expect(path).not.toContain('?');
	});
});
