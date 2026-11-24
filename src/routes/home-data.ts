import { getRequestEvent } from '@solidjs/web';
import { auth } from '$lib/server/auth';
import { isUserPro } from '$lib/server/pro';
import { getLatestInstaller } from '$lib/server/cache';
import { isRecentRelease } from '$lib/utils/release';

export async function getHomeData() {
	'use server';
	const headers = getRequestEvent()?.request.headers ?? new Headers();
	const session = await auth.api.getSession({ headers });
	const isPro = session?.user ? await isUserPro(session.user.id) : false;
	const latest = getLatestInstaller();
	return {
		isPro,
		newRelease: latest && isRecentRelease(latest.createdAt) ? { version: latest.version } : null
	};
}
