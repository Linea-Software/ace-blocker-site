import { json, error, type RequestHandler } from '@sveltejs/kit';
import { createDeviceLink } from '$lib/server/device-link';

export const POST: RequestHandler = async ({ request, url }) => {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) error(403, 'Cross-origin link denied');
	const challenge = await createDeviceLink();
	return json(
		{ ...challenge, verificationUri: `${url.origin}/connect` },
		{ headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }
	);
};
