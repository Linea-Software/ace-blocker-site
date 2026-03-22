import { Elysia, t } from 'elysia';
import { getLatestReleasesCache } from '../cache';

export const releasesRouter = new Elysia({ prefix: '/releases' })
	.get(
		'/latest',
		async ({ status }) => {
			try {
				const cache = await getLatestReleasesCache();
				
				// Strip file paths, keeping only version and basic metadata
				return {
					installer: cache.installers ? { 
						version: cache.installers.version,
						size: cache.installers.size,
						os: cache.installers.os,
						architecture: cache.installers.architecture,
						createdAt: cache.installers.createdAt
					} : null,
					resistance: cache.resistance ? { 
						version: cache.resistance.version,
						size: cache.resistance.size,
						createdAt: cache.resistance.createdAt
					} : null,
					tracking: cache.tracking ? { 
						version: cache.tracking.version,
						size: cache.tracking.size,
						createdAt: cache.tracking.createdAt
					} : null,
					siteLists: Object.fromEntries(
						Object.entries(cache.siteLists).map(([id, list]) => [
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
