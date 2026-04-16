import { Elysia, t } from 'elysia';
import { auth } from '$lib/server/auth';
import { isUserPro, getProStatus } from '$lib/server/pro';
import { db } from '$lib/server/db';
import { user, apikey } from '$lib/server/db/schema';
import { eq, like } from 'drizzle-orm';

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

			// Delete existing 'Desktop App' keys for this user to avoid clutter
			const existingKeys = await auth.api.listApiKeys({
				headers: request.headers
			});

			for (const key of existingKeys.apiKeys) {
				if (key.name === 'Desktop App') {
					await auth.api.deleteApiKey({
						body: { keyId: key.id },
						headers: request.headers
					});
				}
			}

			const isDev = process.env.NODE_ENV === 'development';

			// Create a new one
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
	);
