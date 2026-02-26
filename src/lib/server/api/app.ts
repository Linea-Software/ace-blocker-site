import { dev } from '$app/environment';
import { swaggerUI } from '@hono/swagger-ui';
import { OpenAPIHono } from '@hono/zod-openapi';
import { merge, isErrorResult } from 'openapi-merge';
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

/**
 * Better Auth generates OpenAPI 3.1 compatible schemas which might include
 * "type": ["string", "null"]. OpenAPI 3.0 (used by many UIs) doesn't support this.
 * This function recursively fixes these to "type": "string", "nullable": true.
 */
function fixBetterAuthSchema(obj: any) {
    if (!obj || typeof obj !== 'object') return;
    if (obj.type && Array.isArray(obj.type)) {
        const types = obj.type as string[];
        const hasNull = types.includes('null');
        const mainType = types.find((t) => t !== 'null');
        if (mainType) {
            obj.type = mainType;
            if (hasNull) {
                obj.nullable = true;
            }
        } else if (hasNull) {
            obj.type = 'string'; // Default fallback
            obj.nullable = true;
        }
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (typeof obj[key] === 'object') {
                fixBetterAuthSchema(obj[key]);
            }
        }
    }
}

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
                fixBetterAuthSchema(authDoc);

                const mergeResult = merge([
                    {
                        oas: doc as any,
                    },
                    {
                        oas: authDoc as any,
                        pathModification: { prepend: '/auth' },
                    },
                ]);

                if (!isErrorResult(mergeResult)) {
                    return c.json(mergeResult.output);
                } else {
                    console.error('OpenAPI Merge Error:', mergeResult.message);
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

