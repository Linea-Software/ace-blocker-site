import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { auth } from '$lib/server/auth';
import { isUserPro } from '$lib/server/pro';
import { HTTPException } from 'hono/http-exception';

const AccountDetailsSchema = z.object({
    name: z.string(),
    email: z.email(),
    isPro: z.boolean()
}).openapi('AccountDetails');

const route = createRoute({
    operationId: 'getAccountDetails',
    method: 'get',
    path: '/',
    request: {
        headers: z.object({
            'x-api-key': z.string().openapi({
                param: {
                    name: 'x-api-key',
                    in: 'header'
                },
                example: 'your-api-key-here'
            })
        })
    },
    responses: {
        200: {
            description: 'Account details retrieved successfully',
            content: {
                'application/json': {
                    schema: AccountDetailsSchema
                }
            }
        },
        401: {
            description: 'Unauthorized'
        },
        500: {
            description: 'Internal Server Error'
        }
    }
});

export const accountRouter = new OpenAPIHono();

accountRouter.openapi(route, async (c) => {
    const apiKey = c.req.header('x-api-key');
    if (!apiKey) {
        throw new HTTPException(401, { message: 'x-api-key header required' });
    }

    const session = await auth.api.getSession({
        headers: new Headers({
            'x-api-key': apiKey
        })
    });

    if (!session?.user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const isPro = await isUserPro(session.user.email);

    return c.json({
        name: session.user.name,
        email: session.user.email,
        isPro: isPro
    });
});

const linkEngineRoute = createRoute({
    operationId: 'linkEngine',
    method: 'post',
    path: '/link-engine',
    responses: {
        200: {
            description: 'API key generated/retrieved for desktop app',
            content: {
                'application/json': {
                    schema: z.object({
                        apiKey: z.string()
                    })
                }
            }
        },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal Server Error' }
    }
});

accountRouter.openapi(linkEngineRoute, async (c) => {
    // This endpoint must be called with a session cookie (browser auth)
    // No x-api-key header check here, we want the current session
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
    });

    if (!session?.user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    // Delete existing 'Desktop App' keys for this user to avoid clutter
    const existingKeys = await auth.api.listApiKeys({
        headers: c.req.raw.headers
    });

    for (const key of existingKeys) {
        if (key.name === 'Desktop App') {
            await auth.api.deleteApiKey({
                body: { keyId: key.id },
                headers: c.req.raw.headers
            });
        }
    }

    // Create a new one
    const apiKeyResponse = await auth.api.createApiKey({
        body: {
            name: 'Desktop App',
            userId: session.user.id
        }
    });

    return c.json({
        apiKey: apiKeyResponse.key
    });
});
