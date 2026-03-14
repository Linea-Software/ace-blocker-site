import { Elysia, t } from 'elysia';
import { auth, dodoPayments } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { proStatus, user } from '$lib/server/db/schema';
import crypto from 'crypto';

export const adminRouter = new Elysia({ prefix: '/admin' })
	.derive(async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session || session.user.role !== 'admin') {
			return {
				isAdmin: false,
				adminUser: null
			};
		}

		return {
			isAdmin: true,
			adminUser: session.user
		};
	})
	.onBeforeHandle(({ isAdmin, set }) => {
		if (!isAdmin) {
			set.status = 403;
			return 'Unauthorized: Admin access required';
		}
	})
	.group('/users', (app) =>
		app
			.post(
				'/delete',
				async ({ body, request, set }) => {
					await auth.api.removeUser({
						body: { userId: body.userId },
						headers: request.headers
					});

					const referer = request.headers.get('referer');
					if (referer && !request.headers.get('accept')?.includes('application/json')) {
						set.redirect = referer;
						return;
					}
					return { success: true };
				},
				{
					body: t.Object({
						userId: t.String()
					})
				}
			)
			.post(
				'/toggle-status',
				async ({ body, request, set }) => {
					// Handle both boolean and string "true"/"false" from forms
					const isBanned = typeof body.isBanned === 'string' ? body.isBanned === 'true' : body.isBanned;

					if (isBanned) {
						await auth.api.unbanUser({
							body: { userId: body.userId },
							headers: request.headers
						});
					} else {
						await auth.api.banUser({
							body: { userId: body.userId, banReason: 'Admin disabled' },
							headers: request.headers
						});
					}

					const referer = request.headers.get('referer');
					if (referer && !request.headers.get('accept')?.includes('application/json')) {
						set.redirect = referer;
						return;
					}
					return { success: true };
				},
				{
					body: t.Object({
						userId: t.String(),
						isBanned: t.Any() // Allow string from forms
					})
				}
			)
			.post(
				'/grant-pro',
				async ({ body, set, request }) => {
					const { userId, duration, unit } = body;
					const durationNum = Number(duration);

					const userRow = await db.query.user.findFirst({
						where: (u, { eq }) => eq(u.id, userId),
						columns: { email: true }
					});

					if (!userRow) {
						set.status = 404;
						return { message: 'User not found' };
					}

					const expirationDate = new Date();
					if (unit === 'Days') expirationDate.setDate(expirationDate.getDate() + durationNum);
					else if (unit === 'Months') expirationDate.setMonth(expirationDate.getMonth() + durationNum);
					else if (unit === 'Years') expirationDate.setFullYear(expirationDate.getFullYear() + durationNum);

					let dodoSubscriptionId: string | null = null;
					try {
						const customers = await dodoPayments.customers.list({ email: userRow.email });
						if (customers.items && customers.items.length > 0) {
							const customerId = customers.items[0].customer_id;
							const subs = await dodoPayments.subscriptions.list({
								customer_id: customerId,
								status: 'active'
							});
							if (subs.items && subs.items.length > 0) {
								dodoSubscriptionId = subs.items[0].subscription_id;
							}
						}
					} catch (e) {
						console.error('Error checking Dodo subscriptions:', e);
					}

					if (dodoSubscriptionId) {
						await dodoPayments.subscriptions.update(dodoSubscriptionId, {
							next_billing_date: expirationDate.toISOString()
						});
					}

					await db
						.insert(proStatus)
						.values({
							id: crypto.randomUUID(),
							userId,
							expiration: expirationDate,
							cachedAt: new Date()
						})
						.onConflictDoUpdate({
							target: proStatus.userId,
							set: {
								expiration: expirationDate,
								cachedAt: new Date()
							}
						});

					const referer = request.headers.get('referer');
					if (referer && !request.headers.get('accept')?.includes('application/json')) {
						set.redirect = referer;
						return;
					}
					return { success: true };
				},
				{
					body: t.Object({
						userId: t.String(),
						duration: t.Any(), // Allow string from forms
						unit: t.String()
					})
				}
			)
	);
