import { dodoPayments } from './auth';

export async function getProStatus(email: string): Promise<{ isActive: boolean; expiration: Date }> {
    const inactive = { isActive: false, expiration: new Date(0) };
    try {
        // Find Dodo Customer ID by email
        const customers = await dodoPayments.customers.list({
            email: email
        });

        if (!customers.items || customers.items.length === 0) {
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
            return { isActive: true, expiration: latestExpiration };
        }
    } catch (error) {
        console.error('Error checking Pro status:', error);
    }
    return inactive;
}

export async function isUserPro(email: string): Promise<boolean> {
    const status = await getProStatus(email);
    return status.isActive;
}
