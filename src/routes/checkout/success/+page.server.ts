import { redirect } from '@sveltejs/kit';
import { dodoPayments } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.session || !locals.user) {
        throw redirect(302, '/signin');
    }

    const urlLicenseKey = url.searchParams.get('license_key');

    if (urlLicenseKey) {
        return {
            success: true,
            licenseKey: urlLicenseKey,
            customerName: locals.user.name
        };
    }

    try {
        // Fallback: Find Dodo Customer ID by email
        const customers = await dodoPayments.customers.list({
            email: locals.user.email
        });

        if (!customers.items || customers.items.length === 0) {
            return {
                success: false,
                error: 'No customer account found. Please contact support.'
            };
        }

        const customer = customers.items[0];

        const licenses = await dodoPayments.licenseKeys.list({
            customer_id: customer.customer_id,
            status: 'active'
        });

        if (!licenses.items || licenses.items.length === 0) {
            return {
                success: false,
                error: 'No active license found. Please wait a moment or contact support.'
            };
        }

        const license = licenses.items[0];

        return {
            success: true,
            licenseKey: license.key,
            customerName: locals.user.name
        };
    } catch (error) {
        console.error('Error fetching license key:', error);
        return {
            success: false,
            error: 'Failed to retrieve your license key. Please try refreshing the page.'
        };
    }
};
