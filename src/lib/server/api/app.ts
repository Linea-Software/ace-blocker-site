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

app.openAPIRegistry.registerComponent('securitySchemes', 'APIKeyHeader', {
    type: 'apiKey',
    in: 'header',
    name: 'x-api-key',
});

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
    app.get('/v1/openapi.json', async (c) => {
        const doc = app.getOpenAPIDocument({
            openapi: '3.0.0',
            info: {
                version: '1.0.0',
                title: 'Ace Blocker API',
            },
        });

        try {
            const authDoc = await auth.api.generateOpenAPISchema();
            if (authDoc) {
                // Merge paths
                for (const [path, value] of Object.entries(authDoc.paths)) {
                    // Better Auth paths are relative to the auth base, so we add /auth
                    doc.paths[`/auth${path}`] = value as any;
                }

                // Merge components
                if (authDoc.components) {
                    doc.components = doc.components || {};
                    if (authDoc.components.schemas) {
                        doc.components.schemas = {
                            ...doc.components.schemas,
                            ...(authDoc.components.schemas as any),
                        };
                    }
                    if (authDoc.components.securitySchemes) {
                        doc.components.securitySchemes = {
                            ...doc.components.securitySchemes,
                            ...(authDoc.components.securitySchemes as any),
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Failed to merge Better Auth OpenAPI schema:', e);
        }

        return c.json(doc);
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

