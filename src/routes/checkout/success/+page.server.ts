import { redirect } from '@sveltejs/kit';
import { dodoPayments, auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
    if (!locals.session || !locals.user) {
        throw redirect(302, '/signin');
    }

    const urlLicenseKey = url.searchParams.get('license_key');
    let licenseKey = urlLicenseKey;
    let customerName = locals.user.name;

    if (!licenseKey) {
        try {
            // Fallback: Find Dodo Customer ID by email
            const customers = await dodoPayments.customers.list({
                email: locals.user.email
            });

            if (customers.items && customers.items.length > 0) {
                const customer = customers.items[0];
                const licenses = await dodoPayments.licenseKeys.list({
                    customer_id: customer.customer_id,
                    status: 'active'
                });

                if (licenses.items && licenses.items.length > 0) {
                    licenseKey = licenses.items[0].key;
                }
            }
        } catch (error) {
            console.error('Error fetching license key:', error);
        }
    }

    if (!licenseKey) {
        return {
            success: false,
            error: 'No active license found. Please wait a moment or contact support.'
        };
    }

    try {
        // Create an API key for the desktop app
        const apiKeyResponse = await auth.api.createApiKey({
            body: {
                name: 'Desktop App',
                userId: locals.user.id
            }
        });

        return {
            success: true,
            licenseKey,
            apiKey: apiKeyResponse.key,
            customerName
        };
    } catch (error) {
        console.error('Error creating API key:', error);
        return {
            success: false,
            error: 'Failed to generate access keys. Please try refreshing the page.'
        };
    }
};
