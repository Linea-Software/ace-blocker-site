import { OpenAPIHono } from '@hono/zod-openapi';
import { scriptsRouter } from './scripts';
import { sitesListsRouter } from './sites-lists';

export const v1Router = new OpenAPIHono()
    .route('/scripts', scriptsRouter)
    .route('/sites-lists', sitesListsRouter);

