import { Elysia, t } from 'elysia';
import {
	getLatestInstaller,
	getLatestResistanceScript,
	getLatestTrackingScript,
	getLatestSiteLists
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
			const siteLists = getLatestSiteLists();

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
				siteLists: Array.from(siteLists.entries()).map(([id, list]) => ({
					id,
					name: list.name,
					description: `Site list package: ${list.name}`,
					requiresPro: list.requiresProSubscription,
					version: list.fileName.split('.')[0] || list.fileName,
					size: list.size,
					updatedAt: list.updatedAt
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
				siteLists: t.Array(
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
