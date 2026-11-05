import { beforeEach, describe, expect, it, vi } from 'vitest';

const { customersList, subscriptionsList } = vi.hoisted(() => ({
	customersList: vi.fn(),
	subscriptionsList: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	dodoPayments: {
		customers: { list: customersList },
		subscriptions: { list: subscriptionsList }
	}
}));

import {
	findActiveBillingSubscriptions,
	latestActiveBillingSubscription,
	type MatchedSubscription
} from './billing-subscription';

function page<T>(items: T[], next?: () => Promise<unknown>) {
	return {
		items,
		hasNextPage: () => Boolean(next),
		getNextPage: next ?? vi.fn()
	};
}
const identity = {
	email: 'buyer@example.com',
	emailVerified: true,
	dodoCustomerId: null
};
const subscription = (id: string, nextBilling = '2026-12-05T00:00:00Z') => ({
	subscription_id: id,
	next_billing_date: nextBilling,
	status: 'active'
});

describe('Dodo billing identity lookup', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		customersList.mockResolvedValue(page([]));
		subscriptionsList.mockResolvedValue(page([]));
	});

	it('finds an active purchase even if local signup never created a Dodo customer', async () => {
		customersList.mockResolvedValue(
			page([
				{ customer_id: 'cus_correct', email: 'Buyer@example.com' },
				{ customer_id: 'cus_other', email: 'different@example.com' }
			])
		);
		subscriptionsList.mockResolvedValue(page([subscription('sub_1')]));
		const result = await findActiveBillingSubscriptions(identity);
		expect(customersList).toHaveBeenCalledWith({ email: identity.email, page_size: 100 });
		expect(subscriptionsList).toHaveBeenCalledTimes(1);
		expect(subscriptionsList).toHaveBeenCalledWith({
			customer_id: 'cus_correct',
			status: 'active',
			page_size: 100
		});
		expect(result.matches[0].subscription.subscription_id).toBe('sub_1');
		expect(result.hasCustomer).toBe(true);
	});

	it('considers every exact-email customer across pages', async () => {
		customersList.mockResolvedValue(
			page([{ customer_id: 'cus_1', email: identity.email }], async () =>
				page([{ customer_id: 'cus_2', email: identity.email }])
			)
		);
		subscriptionsList.mockImplementation(async ({ customer_id }: { customer_id: string }) =>
			page(customer_id === 'cus_2' ? [subscription('sub_2')] : [])
		);
		const result = await findActiveBillingSubscriptions(identity);
		expect(result.matches.map((m) => m.customerId)).toEqual(['cus_2']);
		expect(subscriptionsList).toHaveBeenCalledTimes(2);
	});

	it('rejects fuzzy email matches and never searches by an unverified email', async () => {
		customersList.mockResolvedValue(
			page([{ customer_id: 'cus_attack', email: 'buyer@example.com.attacker.test' }])
		);
		expect(await findActiveBillingSubscriptions(identity)).toEqual({
			hasCustomer: false,
			matches: []
		});
		expect(await findActiveBillingSubscriptions({ ...identity, emailVerified: false })).toEqual(
			{
				hasCustomer: false,
				matches: []
			}
		);
		expect(customersList).toHaveBeenCalledTimes(1);
		expect(subscriptionsList).not.toHaveBeenCalled();
	});

	it('still accepts an existing Better Auth customer ID for an unverified email', async () => {
		subscriptionsList.mockResolvedValue(page([subscription('sub_linked')]));
		const result = await findActiveBillingSubscriptions({
			...identity,
			emailVerified: false,
			dodoCustomerId: 'cus_linked'
		});
		expect(customersList).not.toHaveBeenCalled();
		expect(result.matches[0].customerId).toBe('cus_linked');
	});

	it('chooses the latest active billing date when checkout created multiple customers', () => {
		const matches = [
			{
				customerId: 'cus_old',
				subscription: subscription('sub_old', '2026-12-05T00:00:00Z')
			},
			{ customerId: 'cus_new', subscription: subscription('sub_new', '2027-01-05T00:00:00Z') }
		];
		expect(
			latestActiveBillingSubscription(matches as unknown as MatchedSubscription[])?.customerId
		).toBe('cus_new');
		expect(latestActiveBillingSubscription([])).toBeNull();
	});

	it('propagates provider failures instead of treating them as proof of no subscription', async () => {
		customersList.mockRejectedValue(new Error('Dodo unavailable'));
		await expect(findActiveBillingSubscriptions(identity)).rejects.toThrow('Dodo unavailable');
	});
});
