import { dodoPayments } from './auth';

// ---------------------------------------------------------------------------
// In-memory TTL cache for pro status to avoid hammering the DodoPayments API
// when the client polls backup endpoints in rapid bursts.
// ---------------------------------------------------------------------------
const PRO_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
	value: { isActive: boolean; expiration: Date };
	expiresAt: number;
}

const proStatusCache = new Map<string, CacheEntry>();

export async function getProStatus(
	email: string
): Promise<{ isActive: boolean; expiration: Date }> {
	const now = Date.now();

	// Return cached result if still fresh
	const cached = proStatusCache.get(email);
	if (cached && now < cached.expiresAt) {
		return cached.value;
	}

	const inactive = { isActive: false, expiration: new Date(0) };
	try {
		// Find Dodo Customer ID by email
		const customers = await dodoPayments.customers.list({
			email: email
		});

		if (!customers.items || customers.items.length === 0) {
			proStatusCache.set(email, { value: inactive, expiresAt: now + PRO_CACHE_TTL_MS });
			return inactive;
		}

		const customer = customers.items[0];
		const customerId = customer.customer_id;

		// Check Subscriptions
		const subscriptions = await dodoPayments.subscriptions.list({
			customer_id: customerId,
			status: 'active'
		});

		if (subscriptions.items && subscriptions.items.length > 0) {
			let latestExpiration = new Date(0);
			for (const subscription of subscriptions.items) {
				const nextBilling = subscription.next_billing_date
					? new Date(subscription.next_billing_date)
					: new Date(0);
				if (nextBilling > latestExpiration) {
					latestExpiration = nextBilling;
				}
			}
			const result = { isActive: true, expiration: latestExpiration };
			proStatusCache.set(email, { value: result, expiresAt: now + PRO_CACHE_TTL_MS });
			return result;
		}
	} catch (error) {
		console.error('Error checking Pro status:', error);
		// Don't cache errors — let the next call retry immediately
	}

	proStatusCache.set(email, { value: inactive, expiresAt: now + PRO_CACHE_TTL_MS });
	return inactive;
}

export async function isUserPro(email: string): Promise<boolean> {
	const proStatus = await getProStatus(email);
	return proStatus.isActive;
}
