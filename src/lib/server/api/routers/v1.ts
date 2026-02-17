import { OpenAPIHono } from '@hono/zod-openapi';
import { licenseRouter } from './license';
import { scriptsRouter } from './scripts';

export const v1Router = new OpenAPIHono()
    .route('/licenses', licenseRouter)
    .route('/scripts', scriptsRouter);

