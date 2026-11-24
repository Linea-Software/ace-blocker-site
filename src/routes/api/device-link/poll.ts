import { readBoundedJson } from '$lib/server/bounded-json';
import { pollDeviceLink } from '$lib/server/device-link';

export async function POST(event: { request: Request }) {
	const { request } = event;
	const url = new URL(request.url);
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin)
		return new Response('Cross-origin link denied', { status: 403 });
	const body = await readBoundedJson(request);
	if (body instanceof Response) return body;
	if (typeof body?.deviceCode !== 'string')
		return new Response('Invalid challenge', { status: 400 });
	const result = await pollDeviceLink(body.deviceCode);
	const headers = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };
	if (result.state === 'pending') return Response.json(result, { status: 202, headers });
	if (result.state === 'slow_down')
		return Response.json(result, {
			status: 429,
			headers: { ...headers, 'retry-after': String(result.retryAfter) }
		});
	if (result.state === 'expired' || result.state === 'consumed')
		return Response.json(result, { status: 410, headers });
	return Response.json(result, { headers });
}
