import { Elysia, t } from 'elysia';
import {
	getLatestInstaller,
	getLatestResistanceScript,
	getLatestTrackingScript,
	getLatestSitePacks
} from '../../cache';
import { createLogger } from '$lib/server/logger';

const log = createLogger('api:releases');

export const releasesRouter = new Elysia({ prefix: '/releases' }).get(
	'/latest',
	async ({ status }) => {
		try {
			const installer = getLatestInstaller();
			const resistance = getLatestResistanceScript();
			const tracking = getLatestTrackingScript();
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
							createdAt: resistance.createdAt
						}
					: null,
				tracking: tracking
					? {
							version: tracking.version,
							size: tracking.size,
							createdAt: tracking.createdAt
						}
					: null,
				sitePacks: Array.from(sitePacks.entries()).map(([id, pack]) => ({
					id,
					name: pack.name,
					description: `Site pack package: ${pack.name}`,
					requiresPro: pack.requiresProSubscription,
					version: pack.fileName.split('.')[0] || pack.fileName,
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
						createdAt: t.Date()
					})
				),
				tracking: t.Nullable(
					t.Object({
						version: t.String(),
						size: t.Number(),
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
