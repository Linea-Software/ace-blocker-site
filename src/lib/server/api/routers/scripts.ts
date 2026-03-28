import { Elysia, t } from 'elysia';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import { getLatestResistanceScript } from '../../cache';

if (!env.BUNNY_SECURITY_KEY) {
	throw new Error('❌ BUNNY_SECURITY_KEY is missing in environment variables');
}

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

			const isPro = await isUserPro(user.email);
			if (!isPro) {
				return status(403, 'Pro license required');
			}

			const latestRecord = getLatestResistanceScript();

			if (!latestRecord) {
				return status(404, 'No resistance mode script has been uploaded yet');
			}

			const securityKey = env.BUNNY_SECURITY_KEY;
			// Retrieve from the new dynamic folder structure created by the admin panel
			// Folder format: resistance-mode-scripts/<version>/<fileName>
			const storagePath = `/resistance-mode-scripts/${latestRecord.version}/${latestRecord.fileName}`;

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

			return { url: downloadUrl, version: latestRecord.version };
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
					version: t.String()
				}),
				401: t.String(),
				403: t.String(),
				404: t.String(),
				500: t.String()
			}
		}
	);
