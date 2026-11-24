import { query } from '@solidjs/router';
import { getRequestEvent, redirect } from '@solidjs/web';

/**
 * Private, request-scoped account data. This is a Solid 2 server function,
 * not a client-supplied user ID and not a SvelteKit PageServerLoad.
 */
export const getAccountData = query(async () => {
	'use server';
	const event = getRequestEvent();
	if (!event) throw new Error('Missing request context');
	const [{ auth, dodoPayments }, { db }, { getProStatus }, { eq }, { session }] =
		await Promise.all([
			import('$lib/server/auth'),
			import('$lib/server/db'),
			import('$lib/server/pro'),
			import('drizzle-orm'),
			import('$lib/server/db/schema')
		]);
	const authSession = await auth.api.getSession({ headers: event.request.headers });
	if (!authSession?.user) throw redirect('/signin');
	const user = authSession.user;
	const proStatus = await getProStatus(user.id);
	const dbSessions = await db.select().from(session).where(eq(session.userId, user.id));

	let isCancelled = false;
	if (proStatus.isPro) {
		try {
			const customerId = (user as { dodoCustomerId?: string }).dodoCustomerId;
			if (customerId) {
				const subs = await dodoPayments.subscriptions.list({
					customer_id: customerId,
					status: 'active'
				});
				isCancelled = (subs.items ?? []).some((sub) => sub.cancel_at_next_billing_date);
			}
		} catch {
			// Billing API outage must not grant cancellation or change authorization.
		}
	}
	return {
		user: {
			name: user.name,
			email: user.email,
			role: user.role ?? 'user',
			createdAt: new Date(user.createdAt).toISOString(),
			locale: (user as { locale?: string }).locale ?? 'en',
			twoFactorEnabled: (user as { twoFactorEnabled?: boolean }).twoFactorEnabled
		},
		sessions: dbSessions.map((s) => ({
			id: s.id,
			createdAt: s.createdAt.toISOString(),
			ipAddress: s.ipAddress ?? null,
			userAgent: s.userAgent ?? null,
			isCurrent: s.token === authSession.session?.token
		})),
		isPro: proStatus.isPro,
		proExpiration: proStatus.expirationDate?.toISOString() ?? null,
		isCancelled
	};
}, 'account-data');
