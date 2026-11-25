import { query } from '@solidjs/router';
import { getRequestEvent, respond } from '@solidjs/web';

export const getPricingData = query(
	async (currencyQuery: string = '', browserHint: string = '') => {
		'use server';
		const request = getRequestEvent()?.request;
		if (!request) throw respond({ error: 'Missing request' }, { status: 400 });
		const { loadPricingData } = await import('$lib/server/pricing-page-data');
		return loadPricingData(request, currencyQuery, browserHint);
	},
	'pricing'
);
