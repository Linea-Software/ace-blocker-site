import { OpenAPIHono } from '@hono/zod-openapi';
import { licenseRouter } from './license';
import { scriptsRouter } from './scripts';
import { trialsRouter } from './trials';

export const v1Router = new OpenAPIHono()
    .route('/licenses', licenseRouter)
    .route('/scripts', scriptsRouter)
    .route('/trials', trialsRouter);

