import { readBoundedJson } from '$lib/server/bounded-json';
import { auth } from '$lib/server/auth';
import { approveDeviceLink } from '$lib/server/device-link';

export async function POST(event: { request: Request }) {
	const { request } = event;
	const url = new URL(request.url);
	if (request.headers.get('origin') !== url.origin)
		return new Response('Invalid origin', { status: 403 });
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !session.user.emailVerified)
		return new Response('Verified sign-in required', { status: 401 });
	const body = await readBoundedJson(request);
	if (body instanceof Response) return body;
	if (typeof body?.code !== 'string') return new Response('Invalid code', { status: 400 });
	if (!(await approveDeviceLink(body.code, session.user.id)))
		return new Response('Invalid, expired or used code', { status: 400 });
	return Response.json({ approved: true }, { headers: { 'cache-control': 'no-store' } });
}
