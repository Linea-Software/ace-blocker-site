import { redirect } from '@sveltejs/kit';
import { dodoPayments, auth } from '$lib/server/auth';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.session || !locals.user) {
		throw redirect(302, '/signin');
	}

	let customerName = locals.user.name;

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
