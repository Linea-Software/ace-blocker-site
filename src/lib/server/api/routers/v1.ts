import { OpenAPIHono } from '@hono/zod-openapi';
import { scriptsRouter } from './scripts';
import { sitesListsRouter } from './sites-lists';
import { backupsRouter } from './backups';
import { accountRouter } from './account';
import { auth } from '$lib/server/auth';

export const v1Router = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>()
    .route('/scripts', scriptsRouter)
    .route('/sites-lists', sitesListsRouter)
    .route('/backups', backupsRouter)
    .route('/account', accountRouter);

