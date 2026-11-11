import { json, error, type RequestHandler } from '@sveltejs/kit';
import { pollDeviceLink } from '$lib/server/device-link';

export const POST: RequestHandler = async ({ request, url }) => {
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin) error(403, 'Cross-origin link denied');
	if (Number(request.headers.get('content-length') || 0) > 1024) error(413, 'Request too large');
	const body = await request.json().catch(() => null);
	if (typeof body?.deviceCode !== 'string') error(400, 'Invalid challenge');
	const result = await pollDeviceLink(body.deviceCode);
	const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };
	if (result.state === 'pending') return json(result, { status: 202, headers });
	if (result.state === 'slow_down')
		return json(result, {
			status: 429,
			headers: { ...headers, 'retry-after': String(result.retryAfter) }
		});
	if (result.state === 'expired' || result.state === 'consumed')
		return json(result, { status: 410, headers });
	return json(result, { headers });
};
