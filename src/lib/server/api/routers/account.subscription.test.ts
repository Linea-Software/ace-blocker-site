import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getSession: vi.fn(),
	findFirst: vi.fn(),
	lookup: vi.fn(),
	latest: vi.fn(),
	getProStatus: vi.fn(),
	updateProExpiration: vi.fn(),
	clearProExpiration: vi.fn(),
	invalidateProCache: vi.fn(),
	updateSubscription: vi.fn(),
	updateDb: vi.fn()
}));

vi.mock('$lib/server/auth', () => ({
	auth: { api: { getSession: mocks.getSession } },
	dodoPayments: { subscriptions: { update: mocks.updateSubscription } }
}));
vi.mock('$lib/server/db', () => ({
	db: {
		query: { user: { findFirst: mocks.findFirst } },
		update: mocks.updateDb
	}
}));
vi.mock('$lib/server/pro', () => ({
	getProStatus: mocks.getProStatus,
	updateProExpiration: mocks.updateProExpiration,
	clearProExpiration: mocks.clearProExpiration,
	invalidateProCache: mocks.invalidateProCache,
	isUserPro: vi.fn()
}));
vi.mock('$lib/server/billing-subscription', () => ({
	findActiveBillingSubscriptions: mocks.lookup,
	latestActiveBillingSubscription: mocks.latest
}));
vi.mock('$lib/server/entitlements', () => ({
	issueEntitlement: vi.fn(),
	getEntitlementPublicKey: vi.fn()
}));
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
}));

import { accountRouter } from './account';

const account = {
	id: 'user_1',
	email: 'buyer@example.com',
	emailVerified: true,
	dodoCustomerId: null
};
const active = {
	customerId: 'cus_from_checkout',
	subscription: {
		status: 'active',
		subscription_id: 'sub_123',
		next_billing_date: '2027-01-05T00:00:00.000Z'
	}
};
const request = (route: string) =>
	accountRouter.handle(new Request(`http://localhost/account/${route}`, { method: 'POST' }));

describe('account subscription reconciliation endpoints', () => {
	beforeEach(() => {
		vi.resetAllMocks();
		mocks.getSession.mockResolvedValue({ user: { id: account.id } });
		mocks.findFirst.mockResolvedValue(account);
		mocks.lookup.mockResolvedValue({ hasCustomer: true, matches: [active] });
		mocks.latest.mockReturnValue(active);
		mocks.getProStatus.mockResolvedValue({ isPro: false, expirationDate: null });
		const chain = { where: vi.fn().mockResolvedValue(undefined) };
		mocks.updateDb.mockReturnValue({ set: vi.fn().mockReturnValue(chain) });
	});

	it('syncs and links a purchase that has no dodoCustomerId on the local user', async () => {
		const response = await request('sync-subscription');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true, changed: true, isPro: true });
		expect(mocks.lookup).toHaveBeenCalledWith(account);
		expect(mocks.updateDb).toHaveBeenCalled();
		expect(mocks.updateProExpiration).toHaveBeenCalledWith(
			account.email,
			new Date(active.subscription.next_billing_date)
		);
	});

	it('returns 200 unchanged when no customer exists, without clearing manually granted Pro', async () => {
		mocks.lookup.mockResolvedValue({ hasCustomer: false, matches: [] });
		mocks.latest.mockReturnValue(null);
		mocks.getProStatus.mockResolvedValue({
			isPro: true,
			expirationDate: new Date('2027-12-05T00:00:00Z')
		});
		const response = await request('sync-subscription');
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({ success: true, changed: false, isPro: true });
		expect(mocks.clearProExpiration).not.toHaveBeenCalled();
	});

	it('verifies purchased Pro when the customer ID was absent from signup', async () => {
		const response = await request('verify-pro');
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ isActive: true });
		expect(mocks.updateProExpiration).toHaveBeenCalled();
	});

	it('does not revoke an unlinked Pro grant just because Dodo has no customer', async () => {
		mocks.lookup.mockResolvedValue({ hasCustomer: false, matches: [] });
		mocks.latest.mockReturnValue(null);
		const response = await request('verify-pro');
		expect(await response.json()).toEqual({ isActive: false });
		expect(mocks.clearProExpiration).not.toHaveBeenCalled();
	});

	it('can cancel an inline checkout subscription without a pre-existing customer ID', async () => {
		const response = await request('cancel-subscription');
		expect(response.status).toBe(200);
		expect(mocks.updateSubscription).toHaveBeenCalledWith(active.subscription.subscription_id, {
			cancel_at_next_billing_date: true,
			cancel_reason: 'cancelled_by_customer'
		});
	});
});
