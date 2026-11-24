import { pageRoutes } from 'virtual:file-routes';
import NotFound from './NotFound';
import { createRouter } from '@solidjs/router';
import { fileRoutes } from '@solidjs/router/fs';

// Localized URLs are public routes, not redirects: preserve canonical paths.
const baseRoutes = fileRoutes(pageRoutes);
export const Router = createRouter({
	routes: [
		...baseRoutes,
		{
			path: '/:locale',
			matchFilters: { locale: /^(?:de|it|es)$/ },
			children: [...baseRoutes, { path: '*missing', component: NotFound }]
		},
		{ path: '*missing', component: NotFound }
	]
});
export const { paths } = Router;
