import { dodoPayments } from './auth';

export async function isUserPro(email: string): Promise<boolean> {
    try {
        // Find Dodo Customer ID by email
        const customers = await dodoPayments.customers.list({
            email: email
        });

        if (customers.items && customers.items.length > 0) {
            const customer = customers.items[0];
            const customerId = customer.customer_id;

            const subscriptions = dodoPayments.subscriptions.list({
                customer_id: customerId
            });

            for await (const subscription of subscriptions) {
                if (subscription.status === 'active') {
                    return true;
                }
            }

            const licenses = await dodoPayments.licenseKeys.list({
                customer_id: customerId,
                status: 'active'
            });
            if (licenses.items && licenses.items.length > 0) {
                return true;
            }
        }
    } catch (error) {
        console.error('Error checking Pro status:', error);
    }
    return false;
}
