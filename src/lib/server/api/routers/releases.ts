import { Elysia, t } from 'elysia';
import { getLatestInstaller, getLatestResistanceScript, getLatestSitePacks } from '../../cache';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:releases');

function sitePackVersion(updatedAt: Date): string {
	const year = updatedAt.getUTCFullYear();
	const month = String(updatedAt.getUTCMonth() + 1).padStart(2, '0');
	const day = String(updatedAt.getUTCDate()).padStart(2, '0');
	return `${year}.${month}.${day}`;
}

export const releasesRouter = new Elysia({ prefix: '/releases' }).get(
	'/latest',
	async ({ status }) => {
		try {
			const installer = getLatestInstaller();
			const resistance = getLatestResistanceScript();
			const sitePacks = getLatestSitePacks();

			// Strip file paths, keeping only version and basic metadata
			return {
				installer: installer
					? {
							version: installer.version,
							size: installer.size,
							os: installer.os,
							architecture: installer.architecture,
							createdAt: installer.createdAt
						}
					: null,
				resistance: resistance
					? {
							version: resistance.version,
							size: resistance.size,
							sha256: resistance.sha256,
							createdAt: resistance.createdAt
						}
					: null,
				sitePacks: Array.from(sitePacks.entries()).map(([id, pack]) => ({
					id,
					name: pack.name,
					description: `Site pack package: ${pack.name}`,
					requiresPro: pack.requiresProSubscription,
					version: sitePackVersion(pack.updatedAt),
					size: pack.size,
					updatedAt: pack.updatedAt
				}))
			};
		} catch (e) {
			log.error({ err: e }, 'Failed to fetch latest releases cache');
			return status(500, 'Internal Server Error');
		}
	},
	{
		detail: {
			operationId: 'getLatestReleasesVersionData',
			summary: 'Get metadata for the latest software releases directly from cache',
			security: []
		},
		response: {
			200: t.Object({
				installer: t.Nullable(
					t.Object({
						version: t.String(),
						size: t.Number(),
						os: t.String(),
						architecture: t.String(),
						createdAt: t.Date()
					})
				),
				resistance: t.Nullable(
					t.Object({
						version: t.String(),
						size: t.Number(),
						sha256: t.String(),
						createdAt: t.Date()
					})
				),
				sitePacks: t.Array(
					t.Object({
						id: t.String(),
						name: t.String(),
						description: t.String(),
						requiresPro: t.Boolean(),
						version: t.String(),
						size: t.Number(),
						updatedAt: t.Date()
					})
				)
			}),
			500: t.String()
		}
	}
);
