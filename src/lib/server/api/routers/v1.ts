import { Elysia } from 'elysia';
import { scriptsRouter } from './scripts';
import { sitesListsRouter } from './sites-lists';
import { backupsRouter } from './backups';
import { accountRouter } from './account';
import { adminRouter } from './admin';

export const v1Router = new Elysia({ prefix: '/v1' })
	.use(scriptsRouter)
	.use(sitesListsRouter)
	.use(backupsRouter)
	.use(accountRouter)
	.use(adminRouter);
