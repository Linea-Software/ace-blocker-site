import { Elysia, t } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { getResistanceModeScriptsURL, CDNErrorType } from '$lib/server/cdn';
import { incrementResistanceScriptDownloadCount } from '$lib/server/cache';

export const scriptsRouter = new Elysia({ prefix: '/scripts' })
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
		'/resistance-mode',
		async ({ user, status }) => {
			if (!user) {
				return status(401, 'Unauthorized');
			}

			const isPro = await isUserPro(user.id);
			if (!isPro) {
				return status(403, 'Pro license required');
			}

			const result = getResistanceModeScriptsURL();

			if (result.isErr()) {
				// No release is currently marked downloadable (never published
				// or revoked) — this is a "not found", not a server failure.
				if (result.error === CDNErrorType.ServiceUnavailable) {
					return status(
						503,
						'Resistance scripts download is unavailable: CDN is not configured'
					);
				}
				if (result.error === CDNErrorType.NoReleaseAvailable) {
					return status(404, 'No resistance scripts release available');
				}
				return status(500, 'Internal server error');
			}

			const info = result._unsafeUnwrap();

			// Fire-and-forget: increment download count
			incrementResistanceScriptDownloadCount();

			return {
				url: info.url.toString(),
				version: info.version,
				sha256: info.sha256
			};
		},
		{
			detail: {
				operationId: 'getResistanceModeScripts',
				summary: 'Get download URL for resistance mode scripts',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					url: t.String(),
					version: t.String(),
					sha256: t.String()
				}),
				401: t.String(),
				403: t.String(),
				404: t.String(),
				500: t.String(),
				503: t.String()
			}
		}
	);
