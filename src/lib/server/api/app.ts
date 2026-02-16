import { dev } from '$app/environment';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { v1Router } from './routers/v1';

export const app = new OpenAPIHono().basePath('/api');


app.route('/v1', v1Router);

if (dev) {
    app.doc('/v1/openapi.json', {
        openapi: '3.0.0',
        info: {
            version: '1.0.0',
            title: 'Ace Blocker API',
        },
    });

    app.get(
        '/docs',
        swaggerUI({
            url: '/api/v1/openapi.json',
        })
    );

    // Redirect the root to docs in dev
    app.get('/', (c) => c.redirect('/api/docs'));
}


export type AppType = typeof app;

