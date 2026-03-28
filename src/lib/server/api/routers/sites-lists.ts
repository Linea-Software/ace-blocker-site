import { Elysia, t } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';

import { CDNErrorType, getSiteListPath } from '$lib/server/cdn';

export const sitesListsRouter = new Elysia({ prefix: '/sites-lists' })
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
		'/:siteListUuid/backup',
		async ({ params: { siteListUuid }, user, status }) => {
			const isPro = user ? await isUserPro(user.id) : false;

			const result = getSiteListPath(siteListUuid, isPro);

			if (result.isErr()) {
				switch (result.error) {
					case CDNErrorType.ProSubscriptionRequired:
						return status(401, 'Pro subscription required');

					case CDNErrorType.SiteListNotFound:
						return status(403, 'Site list not found');
				}
			}

			return { url: result.value.toString() };
		},
		{
			params: t.Object({
				siteListUuid: t.String({ format: 'uuid' })
			}),
			detail: {
				operationId: 'getSitesListBackup',
				summary: 'Get download URL for a sites list backup',
				security: [{ APIKeyHeader: [] }]
			},
			response: {
				200: t.Object({
					url: t.String()
				}),
				401: t.String(),
				403: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	);
