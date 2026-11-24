import { getRequestEvent, redirect } from '@solidjs/web';
import { auth } from '$lib/server/auth';

/** All admin server reads must enforce authorization independently of the layout. */
export async function assertAdminSession() {
	'use server';
	const request = getRequestEvent()?.request;
	if (!request || request.headers.has('x-api-key') || request.headers.has('authorization'))
		throw redirect('/');
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user || session.user.role !== 'admin') throw redirect('/');
	return { id: session.user.id, role: session.user.role };
}
