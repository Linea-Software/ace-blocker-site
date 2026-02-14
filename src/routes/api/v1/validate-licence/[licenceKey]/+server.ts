import { dodoPayments } from '$lib/server/auth';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
    const { licenceKey } = params;

    if (!licenceKey) {
        throw error(400, 'Missing license key');
    }

    try {
        const result = await dodoPayments.licenses.validate({
            license_key: licenceKey
        });

        return json(result);
    } catch (e) {
        console.error('Error validating license:', e);
        throw error(500, 'Failed to validate license');
    }
};
