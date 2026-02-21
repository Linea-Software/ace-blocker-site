import { OpenAPIHono } from '@hono/zod-openapi';
import { licenseRouter } from './license';
import { scriptsRouter } from './scripts';
import { sitesListsRouter } from './sites-lists';

export const v1Router = new OpenAPIHono()
    .route('/licenses', licenseRouter)
    .route('/scripts', scriptsRouter)
    .route('/sites-lists', sitesListsRouter);

