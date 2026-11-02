import { describe, expect, it } from 'vitest';
import { shouldCreateDodoCustomerOnSignUp } from './dodo';

describe('Dodo Payments signup integration', () => {
	it('does not create Dodo customers for development or tests, regardless of key presence', () => {
		expect(shouldCreateDodoCustomerOnSignUp({ NODE_ENV: 'development' })).toBe(false);
		expect(
			shouldCreateDodoCustomerOnSignUp({
				NODE_ENV: 'development',
				DODO_PAYMENTS_API_KEY: 'sk_test_invalid'
			})
		).toBe(false);
		expect(shouldCreateDodoCustomerOnSignUp({ NODE_ENV: 'test' })).toBe(false);
	});

	it('retains automatic billing customer creation in production', () => {
		expect(shouldCreateDodoCustomerOnSignUp({ NODE_ENV: 'production' })).toBe(true);
	});
});
