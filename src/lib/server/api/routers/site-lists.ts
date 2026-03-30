import { Elysia, t } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { siteList } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import { CDNErrorType, getSiteListURL } from '$lib/server/cdn';

export const sitesListsRouter = new Elysia({ prefix: '/site-lists' })
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
		'/:siteListId/backup',
		async ({ params: { siteListId }, user, status }) => {
			// Check if the site list requires Pro subscription
			const list = await db.query.siteList.findFirst({
				where: eq(siteList.id, siteListId),
				columns: { requiresProSubscription: true }
			});

			if (!list) {
				return status(404, 'Site list not found');
			}

			// Only check Pro status if the list requires it
			const isPro = list.requiresProSubscription
				? user
					? await isUserPro(user.id)
					: false
				: true; // Non-Pro lists are accessible to everyone

			const result = getSiteListURL(siteListId, isPro);

			if (result.isErr()) {
				switch (result.error) {
					case CDNErrorType.ProSubscriptionRequired:
						return status(401, 'Pro subscription required');

					case CDNErrorType.SiteListNotFound:
						return status(404, 'Site list not found');

					default:
						return status(500, 'Internal server error');
				}
			}

			// We're handling the error case properly, so unsafe unwrap can be used
			return { url: result._unsafeUnwrap().toString() };
		},
		{
			params: t.Object({
				siteListId: t.String()
			}),
			detail: {
				operationId: 'getSiteListBackup',
				summary: 'Get download URL for a site list backup',
				security: []
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
