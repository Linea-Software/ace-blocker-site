import { json, error, type RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { approveDeviceLink } from '$lib/server/device-link';

export const POST: RequestHandler = async ({ request, url }) => {
	// Browser authorization requires a valid same-origin session and Origin.
	if (request.headers.get('origin') !== url.origin) error(403, 'Invalid origin');
	if (Number(request.headers.get('content-length') || 0) > 1024) error(413, 'Request too large');
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || !session.user.emailVerified) error(401, 'Verified sign-in required');
	const body = await request.json().catch(() => null);
	if (typeof body?.code !== 'string') error(400, 'Invalid code');
	if (!(await approveDeviceLink(body.code, session.user.id)))
		error(400, 'Invalid, expired or used code');
	return json({ approved: true }, { headers: { 'cache-control': 'no-store' } });
};
