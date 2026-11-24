import { createDeviceLink } from '$lib/server/device-link';

export async function POST(event: { request: Request }) {
	const { request } = event;
	const url = new URL(request.url);
	const origin = request.headers.get('origin');
	if (origin && origin !== url.origin)
		return new Response('Cross-origin link denied', { status: 403 });
	const challenge = await createDeviceLink();
	return Response.json(
		{ ...challenge, verificationUri: url.origin + '/connect' },
		{ headers: { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } }
	);
}
