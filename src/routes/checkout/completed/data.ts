import { query } from '@solidjs/router';
import { getRequestEvent, redirect, respond } from '@solidjs/web';
import { auth } from '$lib/server/auth';
import { createLogger } from '$lib/server/logger';

const log = createLogger('routes:checkout-completed');

export const getCompletedData = query(async () => {
	'use server';
	const request = getRequestEvent()?.request;
	if (!request) throw respond({ error: 'Missing request' }, { status: 400 });
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user) {
		throw redirect('/signin');
	}

	const customerName = session.user.name;

	try {
		// Check current pro status
		const { isUserPro } = await import('$lib/server/pro');
		const isPro = await isUserPro(session.user.id);

		return {
			success: true,
			customerName,
			isPro
		};
	} catch (error) {
		log.error({ err: error }, 'Error checking pro status');
		return {
			success: false,
			error: 'Failed to generate access keys. Please try refreshing the page.'
		};
	}
}, 'checkout-completed');
