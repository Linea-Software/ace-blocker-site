import { dev } from '$app/environment';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { v1Router } from './routers/v1';
import { auth } from '$lib/server/auth';

export const app = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>().basePath('/api');

// Better Auth Middleware
app.use('*', async (c, next) => {
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (!session) {
        c.set('user', null);
        c.set('session', null);
        return next();
    }

    c.set('user', session.user);
    c.set('session', session.session);
    return next();
});

// Better Auth Handler
app.on(['POST', 'GET'], '/auth/*', (c) => auth.handler(c.req.raw));

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

