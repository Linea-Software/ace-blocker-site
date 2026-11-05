import { dodoPayments } from '$lib/server/auth';

/** Billing checkout can create a Dodo customer after account signup.
 * Local signup deliberately does not create one, so the Better Auth
 * dodoCustomerId field is not necessarily populated after a purchase.
 */
export type BillingIdentity = {
	email: string;
	emailVerified: boolean;
	dodoCustomerId: string | null;
};

type Subscription = Awaited<ReturnType<typeof dodoPayments.subscriptions.list>>['items'][number];

export type MatchedSubscription = { customerId: string; subscription: Subscription };

/**
 * Look up subscriptions for the signed-in user's verified billing email.
 * Never trust a fuzzy Dodo email search result as proof of ownership.
 * Also include a customer ID linked directly by Better Auth.
 */
export async function findActiveBillingSubscriptions(
	account: BillingIdentity
): Promise<{ hasCustomer: boolean; matches: MatchedSubscription[] }> {
	const ids = new Set<string>();
	if (account.dodoCustomerId) ids.add(account.dodoCustomerId);

	if (account.emailVerified) {
		const normalizedEmail = account.email.trim().toLowerCase();
		let customers = await dodoPayments.customers.list({
			email: account.email,
			page_size: 100
		});
		// Dodo can create more than one billing customer for the same email.
		// Iterate every page rather than binding to an arbitrary first result.
		do {
			for (const customer of customers.items ?? []) {
				if (customer.email.trim().toLowerCase() === normalizedEmail) {
					ids.add(customer.customer_id);
				}
			}
			if (!customers.hasNextPage()) break;
			customers = await customers.getNextPage();
		} while (true);
	}

	const matches: MatchedSubscription[] = [];
	for (const customerId of ids) {
		let subscriptions = await dodoPayments.subscriptions.list({
			customer_id: customerId,
			status: 'active',
			page_size: 100
		});
		do {
			for (const subscription of subscriptions.items ?? []) {
				if (subscription.status === 'active') matches.push({ customerId, subscription });
			}
			if (!subscriptions.hasNextPage()) break;
			subscriptions = await subscriptions.getNextPage();
		} while (true);
	}

	return { hasCustomer: ids.size > 0, matches };
}

/** Prefer the entitlement with the latest known billing date, if any. */
export function latestActiveBillingSubscription(
	matches: MatchedSubscription[]
): MatchedSubscription | null {
	return (
		[...matches].sort(
			(a, b) =>
				(Date.parse(b.subscription.next_billing_date ?? '') || 0) -
				(Date.parse(a.subscription.next_billing_date ?? '') || 0)
		)[0] ?? null
	);
}
