import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { getProStatus } from '$lib/server/pro';
import { eq } from 'drizzle-orm';
import { session } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ request }) => {
	const authSession = await auth.api.getSession({
		headers: request.headers
	});

	if (!authSession?.user) {
		throw redirect(302, '/signin');
	}

	const user = authSession.user;

	// Load active sessions
	const sessions = await auth.api.listSessions({
		headers: request.headers
	});

	// Load pro status
	const proStatus = await getProStatus(user.id);

	// Get all user sessions from DB for richer info (IP, userAgent, etc.)
	const dbSessions = await db.select().from(session).where(eq(session.userId, user.id));

	return {
		user: {
			name: user.name,
			email: user.email,
			createdAt: user.createdAt,
			locale: (user as any).locale ?? 'en',
			twoFactorEnabled: (user as any).twoFactorEnabled as boolean | undefined
		},
		sessions: dbSessions.map((s) => ({
			id: s.id,
			createdAt: s.createdAt.toISOString(),
			ipAddress: s.ipAddress ?? null,
			userAgent: s.userAgent ?? null,
			token: s.token,
			isCurrent: s.token === authSession.session?.token
		})),
		isPro: proStatus.isPro,
		proExpiration: proStatus.expirationDate?.toISOString() ?? null
	};
};
