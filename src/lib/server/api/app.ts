import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { v1Router } from './routers/v1';
import { dev } from '$app/environment';

export const app = new OpenAPIHono();

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
}

export type AppType = typeof app;

