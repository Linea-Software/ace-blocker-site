import { Elysia, t } from 'elysia';
import { auth, dodoPayments } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { proStatus, user } from '$lib/server/db/schema';
import crypto from 'crypto';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:admin:users');

export const usersRouter = new Elysia({ prefix: '/users' })
	.post(
		'/delete',
		async ({ body, request, set }) => {
			await auth.api.removeUser({
				body: { userId: body.userId },
				headers: request.headers
			});

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
			const isBanned =
				typeof body.isBanned === 'string' ? body.isBanned === 'true' : body.isBanned;

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
			else if (unit === 'Months')
				expirationDate.setMonth(expirationDate.getMonth() + durationNum);
			else if (unit === 'Years')
				expirationDate.setFullYear(expirationDate.getFullYear() + durationNum);

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
				log.error({ err: e }, 'Error checking Dodo subscriptions');
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
			return { success: true };
		},
		{
			body: t.Object({
				userId: t.String(),
				duration: t.Any(), // Allow string from forms
				unit: t.String()
			})
		}
	);
