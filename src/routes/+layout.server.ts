import type { LayoutServerLoad } from './$types';
import { dodoPayments } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
    let isPro = false;

    if (locals.user) {
        try {
            // Find Dodo Customer ID by email
            const customers = await dodoPayments.customers.list({
                email: locals.user.email
            });

            const customer = customers.items?.[0];

            if (customer) {
                const customerId = customer.customer_id;

                // 1. Check for active subscriptions
                const subscriptions = dodoPayments.subscriptions.list({
                    customer_id: customerId
                });

                for await (const subscription of subscriptions) {
                    if (subscription.status === 'active') {
                        isPro = true;
                        break;
                    }
                }

                // 2. Fallback: Check for active one-time licenses
                if (!isPro) {
                    const licenses = await dodoPayments.licenseKeys.list({
                        customer_id: customerId,
                        status: 'active'
                    });
                    if (licenses.items && licenses.items.length > 0) {
                        isPro = true;
                    }
                }
            }
        } catch (error) {
            console.error('Error checking Pro status:', error);
        }
    }

    return {
        user: locals.user,
        session: locals.session,
        isPro
    };
};
