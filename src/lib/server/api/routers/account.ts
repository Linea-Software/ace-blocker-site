import { Elysia, t } from 'elysia';
import { auth } from '$lib/server/auth';
import { getProStatus } from '$lib/server/pro';

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
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const proStatus = await getProStatus(user.email);

			return {
				name: user.name,
				email: user.email,
				licence: {
					isActive: proStatus.isActive,
					expiration: proStatus.expiration
				}
			};
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
					licence: t.Object({
						isActive: t.Boolean(),
						expiration: t.Date()
					})
				}),
				401: t.String(),
				500: t.String()
			}
		}
	)
	.post(
		'/link-engine',
		async ({ user, request, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			// Delete existing 'Desktop App' keys for this user to avoid clutter
			const existingKeys = await auth.api.listApiKeys({
				headers: request.headers
			});

			for (const key of existingKeys) {
				if (key.name === 'Desktop App') {
					await auth.api.deleteApiKey({
						body: { keyId: key.id },
						headers: request.headers
					});
				}
			}

			// Create a new one
			const apiKeyResponse = await auth.api.createApiKey({
				body: {
					name: 'Desktop App',
					userId: user.id
				}
			});

			return {
				apiKey: apiKeyResponse.key
			};
		},
		{
			detail: {
				operationId: 'linkEngine',
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
		'/api-keys',
		async ({ user, request, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const keys = await auth.api.listApiKeys({
				headers: request.headers
			});

			return keys.map(
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
		'/revoke',
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
	.post(
		'/verify-pro',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const proStatus = await getProStatus(user.email, true);

			return {
				isActive: proStatus.isActive,
				expiration: proStatus.expiration
			};
		},
		{
			detail: {
				operationId: 'verifyProStatus',
				summary: 'Force sync and verify user pro status',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					isActive: t.Boolean(),
					expiration: t.Date()
				}),
				401: t.String(),
				500: t.String()
			}
		}
	);
