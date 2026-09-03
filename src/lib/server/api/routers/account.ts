import { Elysia, t } from 'elysia';
import { auth, dodoPayments } from '$lib/server/auth';
import {
	isUserPro,
	getProStatus,
	invalidateProCache,
	updateProExpiration,
	clearProExpiration
} from '$lib/server/pro';
import { db } from '$lib/server/db';
import { user as userTable, apikey, proStatus, backups, session } from '$lib/server/db/schema';
import { eq, like } from 'drizzle-orm';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:account');

export const accountRouter = new Elysia({ prefix: '/account' })
	.derive(async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});
		return {
			user: session?.user ?? null,
			session: session?.session ?? null
		};
	})
	.get(
		'/',
		async ({ request, status }) => {
			const session = await auth.api.getSession({
				headers: request.headers
			});

			if (session?.user) {
				return {
					name: session.user.name,
					email: session.user.email,
					isPro: await isUserPro(session.user.id)
				};
			}

			return status(401, 'Unauthorized');
		},
		{
			detail: {
				operationId: 'getAccountDetails',
				summary: 'Get current user account details',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					name: t.String(),
					email: t.String(),
					isPro: t.Boolean()
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	.get(
		'/api-key/create',
		async ({ user, request, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const isDev = process.env.NODE_ENV === 'development';

			// Create a new one
			// @ts-ignore - Better Auth schema extensions might not be fully typed here
			const apiKeyResponse = await auth.api.createApiKey({
				body: {
					name: 'Desktop App',
					userId: user.id,
					// @ts-ignore - Better Auth schema extensions might not be fully typed here
					rateLimitEnabled: !isDev,
					rateLimitMax: 1000,
					rateLimitTimeWindow: 3600000 // 1 hour window
				}
			});

			return {
				apiKey: apiKeyResponse.key
			};
		},
		{
			detail: {
				operationId: 'createApiKey',
				summary: 'Generate API key for desktop app linking',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					apiKey: t.String()
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	.get(
		'/api-key/list',
		async ({ user, request, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const keys = await auth.api.listApiKeys({
				headers: request.headers
			});

			return keys.apiKeys.map(
				(key: {
					id: string;
					name: string | null;
					createdAt: Date;
					lastRequest: Date | null;
					expiresAt: Date | null;
				}) => ({
					id: key.id,
					name: key.name,
					createdAt: key.createdAt.toISOString(),
					lastRequest: key.lastRequest?.toISOString() ?? null,
					expiresAt: key.expiresAt?.toISOString() ?? null
				})
			);
		},
		{
			detail: {
				operationId: 'listApiKeys',
				summary: 'List user API keys',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Array(
					t.Object({
						id: t.String(),
						name: t.Nullable(t.String()),
						createdAt: t.String(),
						lastRequest: t.Nullable(t.String()),
						expiresAt: t.Nullable(t.String())
					})
				),
				401: t.String(),
				500: t.String()
			}
		}
	)
	.post(
		'/api-key/revoke',
		async ({ user, request, body, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			await auth.api.deleteApiKey({
				body: { keyId: body.keyId },
				headers: request.headers
			});

			return {
				success: true
			};
		},
		{
			body: t.Object({
				keyId: t.String()
			}),
			detail: {
				operationId: 'revokeApiKey',
				summary: 'Revoke an API key',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean()
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	.get(
		'/pro',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const proStatus = await getProStatus(user.id);

			return {
				isPro: proStatus.isPro,
				expiration: proStatus.expirationDate
			};
		},
		{
			detail: {
				operationId: 'getProDetails',
				summary: 'Get user pro status',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					isPro: t.Boolean(),
					expiration: t.Nullable(t.Date())
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	// ── Cancel Subscription ─────────────────────────────────────────────────
	.post(
		'/cancel-subscription',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			try {
				const userRow = await db.query.user.findFirst({
					where: (u, { eq }) => eq(u.id, user.id),
					columns: { dodoCustomerId: true }
				});

				if (!userRow?.dodoCustomerId) {
					return status(400, 'No Dodo Payments customer found');
				}

				const subscriptionsPage = await dodoPayments.subscriptions.list({
					customer_id: userRow.dodoCustomerId
				});

				const subscriptionItems = subscriptionsPage.items ?? [];

				if (subscriptionItems.length === 0) {
					return status(404, 'No active subscription found');
				}

				// Cancel all active subscriptions for this customer
				for (const sub of subscriptionItems) {
					await dodoPayments.subscriptions.update(sub.subscription_id, {
						cancel_at_next_billing_date: true,
						cancel_reason: 'cancelled_by_customer'
					});
				}

				// Keep proStatus expiration intact — user retains Pro until billing period ends.
				// The webhook will clear it when the subscription actually expires.
				invalidateProCache(user.id);

				log.info({ userId: user.id }, 'Subscription cancelled');

				return { success: true };
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to cancel subscription');
				return status(500, 'Failed to cancel subscription');
			}
		},
		{
			detail: {
				operationId: 'cancelSubscription',
				summary: 'Cancel the user Pro subscription',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean()
				}),
				400: t.String(),
				401: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	)
	// ── Sync Subscription ─────────────────────────────────────────────────
	.post(
		'/sync-subscription',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			try {
				const userRow = await db.query.user.findFirst({
					where: (u, { eq }) => eq(u.id, user.id),
					columns: { dodoCustomerId: true, email: true }
				});

				if (!userRow?.dodoCustomerId) {
					return status(400, 'No Dodo Payments customer found');
				}

				const subscriptionsPage = await dodoPayments.subscriptions.list({
					customer_id: userRow.dodoCustomerId,
					status: 'active'
				});

				const subscriptionItems = subscriptionsPage.items ?? [];

				// Check current pro status before updating
				const currentProStatus = await getProStatus(user.id);

				if (subscriptionItems.length > 0) {
					// User has an active subscription — sync the next billing date
					const activeSub = subscriptionItems[0];

					if (activeSub.next_billing_date) {
						await updateProExpiration(
							userRow.email,
							new Date(activeSub.next_billing_date)
						);
					}

					log.info({ userId: user.id }, 'Subscription synced — active');

					return {
						success: true,
						changed: !currentProStatus.isPro,
						isPro: true,
						expiration: activeSub.next_billing_date
					};
				}

				// No active subscription — clear pro status if it was set
				const wasPro = currentProStatus.isPro;
				if (wasPro) {
					await clearProExpiration(userRow.email);
				}

				log.info({ userId: user.id }, 'Subscription synced — inactive');

				return {
					success: true,
					changed: wasPro,
					isPro: false,
					expiration: null
				};
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to sync subscription');
				return status(500, 'Failed to sync subscription');
			}
		},
		{
			detail: {
				operationId: 'syncSubscription',
				summary: 'Sync subscription status from Dodo Payments',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean(),
					changed: t.Boolean(),
					isPro: t.Boolean(),
					expiration: t.Nullable(t.String())
				}),
				400: t.String(),
				401: t.String(),
				500: t.String()
			}
		}
	)
	// ── Delete Account ──────────────────────────────────────────────────────
	.post(
		'/delete',
		async ({ user, body, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}
			if (user.role === 'admin') {
				return status(403, 'Administrator accounts cannot be deleted');
			}

			if (body.email !== user.email) {
				return status(400, 'Email does not match');
			}

			try {
				// Delete backups
				await db.delete(backups).where(eq(backups.userId, user.id));

				// Delete proStatus
				await db.delete(proStatus).where(eq(proStatus.userId, user.id));

				// Delete all sessions
				await db.delete(session).where(eq(session.userId, user.id));

				// Delete the user (cascades via DB relations)
				// @ts-ignore - Drizzle table instance typing
				await db.delete(userTable).where(eq(userTable.id, user.id));

				log.info({ userId: user.id }, 'Account deleted');

				return { success: true };
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to delete account');
				return status(500, 'Failed to delete account');
			}
		},
		{
			body: t.Object({
				email: t.String()
			}),
			detail: {
				operationId: 'deleteAccount',
				summary: 'Permanently delete user account and all associated data',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean()
				}),
				400: t.String(),
				401: t.String(),
				403: t.String(),
				500: t.String()
			}
		}
	)
	// ── Export Data ─────────────────────────────────────────────────────────
	.get(
		'/export',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			try {
				const proStatusResult = await getProStatus(user.id);

				const backupData = await db.query.backups.findFirst({
					where: (b, { eq }) => eq(b.userId, user.id)
				});

				const exportData = {
					name: user.name,
					email: user.email,
					createdAt: user.createdAt,
					locale: (user as any).locale ?? 'en',
					proStatus: {
						isPro: proStatusResult.isPro,
						expiration: proStatusResult.expirationDate?.toISOString() ?? null
					},
					backup: backupData ? JSON.parse(backupData.data) : null
				};

				return new Response(JSON.stringify(exportData, null, 2), {
					headers: {
						'Content-Type': 'application/json',
						'Content-Disposition': 'attachment; filename="ace-blocker-data.json"'
					}
				});
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to export data');
				return status(500, 'Failed to export data');
			}
		},
		{
			detail: {
				operationId: 'exportAccountData',
				summary: 'Export user account data as JSON download',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Any(),
				401: t.String(),
				500: t.String()
			}
		}
	)
	// ── Verify Pro ──────────────────────────────────────────────────────────
	// Fail-safe post-checkout verification: force a live DodoPayments check
	// (bypassing both cache layers), sync pro status, and report the result.
	// Used by /checkout/completed to pick up a subscription whose webhook has
	// not arrived yet.
	.post(
		'/verify-pro',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			try {
				const userRow = await db.query.user.findFirst({
					where: (u, { eq }) => eq(u.id, user.id),
					columns: { email: true, dodoCustomerId: true }
				});

				if (!userRow?.dodoCustomerId) {
					return { isActive: false };
				}

				const subscriptionsPage = await dodoPayments.subscriptions.list({
					customer_id: userRow.dodoCustomerId,
					status: 'active'
				});

				const activeSubscriptions = subscriptionsPage.items ?? [];

				if (activeSubscriptions.length === 0) {
					// No active subscription — clear any stale cached pro status
					await clearProExpiration(userRow.email);
					return { isActive: false };
				}

				const activeSubscription = activeSubscriptions[0];
				if (activeSubscription.next_billing_date) {
					await updateProExpiration(
						userRow.email,
						new Date(activeSubscription.next_billing_date)
					);
				} else {
					// Active but expiry unknown — at least make the next read
					// re-check instead of serving a stale cache entry.
					invalidateProCache(user.id);
				}

				return { isActive: true };
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to verify pro status');
				return status(500, 'Failed to verify pro status');
			}
		},
		{
			detail: {
				operationId: 'verifyProStatus',
				summary: 'Force a live DodoPayments check of the current user pro status',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					isActive: t.Boolean()
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	// ── Revoke Session ───────────────────────────────────────────────────────
	// The client identifies a session by its (non-secret) session id. The raw
	// session token is resolved server-side and never leaves the server, so it
	// cannot end up in page data, logs, or the browser devtools.
	.post(
		'/revoke-session',
		async ({ user, request, body, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			try {
				const targetSession = await db.query.session.findFirst({
					where: (s, { eq }) => eq(s.id, body.sessionId),
					columns: { userId: true, token: true }
				});

				if (!targetSession || targetSession.userId !== user.id) {
					return status(404, 'Session not found');
				}

				await auth.api.revokeSession({
					headers: request.headers,
					body: { token: targetSession.token }
				});

				log.info({ userId: user.id, sessionId: body.sessionId }, 'Session revoked');

				return { success: true };
			} catch (err) {
				log.error({ err, userId: user.id }, 'Failed to revoke session');
				return status(500, 'Failed to revoke session');
			}
		},
		{
			body: t.Object({
				sessionId: t.String()
			}),
			detail: {
				operationId: 'revokeSession',
				summary: 'Revoke one of the current user sessions',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					success: t.Boolean()
				}),
				401: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	);
