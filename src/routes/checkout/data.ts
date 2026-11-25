import { getRequestEvent, respond } from '@solidjs/web';

export async function getCheckoutData(queryString: string = '', browserHint: string = '') {
	'use server';
	const request = getRequestEvent()?.request;
	if (!request) throw respond({ error: 'Missing request' }, { status: 400 });
	const { loadCheckoutData } = await import('$lib/server/checkout-page-data');
	return loadCheckoutData(request, queryString, browserHint);
}
