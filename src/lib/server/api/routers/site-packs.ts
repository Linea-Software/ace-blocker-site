import { Elysia, t } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { sitePack } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { incrementSitePackDownloadCount } from '$lib/server/cache';

import { CDNErrorType, getSitePackURL } from '$lib/server/cdn';

export const sitePacksRouter = new Elysia({ prefix: '/site-packs' })
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
		'/:sitePackId/backup',
		async ({ params: { sitePackId }, user, status }) => {
			// Check if the site pack requires Pro subscription
			const pack = await db.query.sitePack.findFirst({
				where: eq(sitePack.id, sitePackId),
				columns: { requiresProSubscription: true }
			});

			if (!pack) {
				return status(404, 'Site pack not found');
			}

			// Only check Pro status if the pack requires it
			const isPro = pack.requiresProSubscription
				? user
					? await isUserPro(user.id)
					: false
				: true; // Non-Pro packs are accessible to everyone

			const result = getSitePackURL(sitePackId, isPro);

			if (result.isErr()) {
				switch (result.error) {
					case CDNErrorType.ProSubscriptionRequired:
						return status(401, 'Pro subscription required');

					case CDNErrorType.SitePackNotFound:
						return status(404, 'Site pack not found');

					default:
						return status(500, 'Internal server error');
				}
			}

			// We're handling the error case properly, so unsafe unwrap can be used
			const url = result._unsafeUnwrap().toString();

			// Fire-and-forget: increment download count
			incrementSitePackDownloadCount(sitePackId);

			return { url };
		},
		{
			params: t.Object({
				sitePackId: t.String()
			}),
			detail: {
				operationId: 'getSitePackBackup',
				summary: 'Get download URL for a site pack backup',
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
