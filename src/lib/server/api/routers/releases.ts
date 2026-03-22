import { Elysia, t } from 'elysia';
import { getLatestInstallerCache, getLatestResistanceCache, getLatestTrackingCache, getLatestSiteListsCache } from '../cache';

export const releasesRouter = new Elysia({ prefix: '/releases' })
	.get(
		'/latest',
		async ({ status }) => {
			try {
				const [installers, resistance, tracking, siteLists] = await Promise.all([
					getLatestInstallerCache(),
					getLatestResistanceCache(),
					getLatestTrackingCache(),
					getLatestSiteListsCache()
				]);
				
				// Strip file paths, keeping only version and basic metadata
				return {
					installer: installers ? { 
						version: installers.version,
						size: installers.size,
						os: installers.os,
						architecture: installers.architecture,
						createdAt: installers.createdAt
					} : null,
					resistance: resistance ? { 
						version: resistance.version,
						size: resistance.size,
						createdAt: resistance.createdAt
					} : null,
					tracking: tracking ? { 
						version: tracking.version,
						size: tracking.size,
						createdAt: tracking.createdAt
					} : null,
					siteLists: Object.fromEntries(
						Object.entries(siteLists).map(([id, list]) => [
							id, {
								version: list.fileName.split('.')[0] || list.fileName, // approx
								size: list.size,
								updatedAt: list.updatedAt
							}
						])
					)
				};
			} catch (e) {
				console.error('Failed to fetch latest releases cache:', e);
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
					installer: t.Nullable(t.Object({ 
						version: t.String(), size: t.Number(), os: t.String(), architecture: t.String(), createdAt: t.Date() 
					})),
					resistance: t.Nullable(t.Object({ 
						version: t.String(), size: t.Number(), createdAt: t.Date() 
					})),
					tracking: t.Nullable(t.Object({ 
						version: t.String(), size: t.Number(), createdAt: t.Date() 
					})),
					siteLists: t.Record(t.String(), t.Object({
						version: t.String(), size: t.Number(), updatedAt: t.Date()
					}))
				}),
				500: t.String()
			}
		}
	);
