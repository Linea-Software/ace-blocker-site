import { OpenAPIHono } from '@hono/zod-openapi';
import { scriptsRouter } from './scripts';
import { sitesListsRouter } from './sites-lists';
import { backupsRouter } from './backups';
import { accountRouter } from './account';

export const v1Router = new OpenAPIHono()
    .route('/scripts', scriptsRouter)
    .route('/sites-lists', sitesListsRouter)
    .route('/backups', backupsRouter)
    .route('/account', accountRouter);

