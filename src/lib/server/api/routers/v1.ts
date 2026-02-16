import { Hono } from 'hono';
import { licenseRouter } from './license';
import { scriptsRouter } from './scripts';

export const v1Router = new Hono()
    .route('/licenses', licenseRouter)
    .route('/scripts', scriptsRouter);
