import { query } from '@solidjs/router';
import { getRequestEvent } from '@solidjs/web';
import { auth } from '$lib/server/auth';
import { isUserPro } from '$lib/server/pro';

/** Request-scoped, Boolean-only entitlement for the shared public navbar.
 * SvelteKit's implicit layout data no longer exists in Solid's file router.
 */
export const getNavbarPro = query(async () => {
	'use server';
	const headers = getRequestEvent()?.request.headers;
	if (!headers) return false;
	const session = await auth.api.getSession({ headers });
	return session?.user ? isUserPro(session.user.id) : false;
}, 'navbar-pro');
