import { Elysia, t, status } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import sitesLists from '$lib/server/data/sites-lists.json';

const SITES_LISTS_MAPPINGS = Object.fromEntries(
	sitesLists.map((list) => [list.id, { requiresPro: list.requires_pro }])
);

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
			const mapping = SITES_LISTS_MAPPINGS[siteListUuid];

			if (!mapping) {
				return status(404, 'File not found');
			}

			if (mapping.requiresPro) {
				if (!user) {
					return status(401, 'Unauthorized (Login required for pro lists)');
				}

				const isPro = await isUserPro(user.email);
				if (!isPro) {
					return status(403, 'Pro license required for pro lists');
				}

				if (!env.BUNNY_SECURITY_KEY) {
					console.error('❌ BUNNY_SECURITY_KEY is missing in environment variables');
					return status(500, 'Internal Server Error');
				}

				const securityKey = env.BUNNY_SECURITY_KEY;
				const storagePath = `/premium/${siteListUuid}_bak.zip`;

				const expires = Math.round(Date.now() / 1000) + 600;
				const hashableBase = securityKey + storagePath + expires;

				const token = crypto
					.createHash('sha256')
					.update(hashableBase)
					.digest('base64')
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.replace(/=/g, '');

				const downloadUrl = `https://cdn.aceblocker.com${storagePath}?token=${token}&expires=${expires}`;

				return { url: downloadUrl };
			} else {
				const downloadUrl = `https://cdn.aceblocker.com/free/${siteListUuid}_bak.zip`;
				return { url: downloadUrl };
			}
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
