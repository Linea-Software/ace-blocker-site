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
        // Fallback: Fetch the most recent active license key for the customer
        const licenses = await dodoPayments.licenseKeys.list({
            customer_id: locals.user.id,
            status: 'active'
        });

        const license = licenses.items[0];

        if (!license) {
            return {
                success: false,
                error: 'No active license found. Please wait a moment or contact support.'
            };
        }

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
