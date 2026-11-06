import { Elysia } from 'elysia';
import { scriptsRouter } from './scripts';
import { sitePacksRouter } from './site-packs';
import { backupsRouter } from './backups';
import { accountRouter } from './account';
import { adminRouter } from './admin';
import { releasesRouter } from './releases';
import { desktopReleasesRouter } from './desktop-releases';

export const v1Router = new Elysia({ prefix: '/v1' })
	.use(scriptsRouter)
	.use(sitePacksRouter)
	.use(backupsRouter)
	.use(accountRouter)
	.use(adminRouter)
	.use(releasesRouter)
	.use(desktopReleasesRouter);
