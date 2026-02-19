import type { LayoutServerLoad } from './$types';
import { dodoPayments } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
    let isPro = false;

    if (locals.user) {
        try {
            // 1. Check for active subscriptions
            const subscriptions = dodoPayments.subscriptions.list({
                customer_id: locals.user.id
            });

            for await (const subscription of subscriptions) {
                if (subscription.status === 'active') {
                    isPro = true;
                    break;
                }
            }

            // 2. Fallback: Check for active one-time licenses if no subscription found
            if (!isPro) {
                const licenses = await dodoPayments.licenseKeys.list({
                    customer_id: locals.user.id,
                    status: 'active'
                });
                if (licenses.items.length > 0) {
                    isPro = true;
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
