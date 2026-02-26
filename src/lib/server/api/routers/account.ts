import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { auth } from '$lib/server/auth';
import { getProStatus } from '$lib/server/pro';
import { HTTPException } from 'hono/http-exception';


const AccountDetailsSchema = z.object({
    name: z.string(),
    email: z.email(),
    licence: z.object({
        isActive: z.boolean(),
        expiration: z.date(),
    })
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

export const accountRouter = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>();

accountRouter.openapi(route, async (c) => {
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const licence = await getProStatus(user.email);

    return c.json({
        name: user.name,
        email: user.email,
        licence: licence
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
    const user = c.get('user');

    if (!user) {
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
            userId: user.id
        }
    });

    return c.json({
        apiKey: apiKeyResponse.key
    });
});

const ListApiKeysRoute = createRoute({
    operationId: 'listApiKeys',
    method: 'get',
    path: '/api-keys',
    responses: {
        200: {
            description: 'List of API keys retrieved successfully',
            content: {
                'application/json': {
                    schema: z.array(z.object({
                        id: z.string(),
                        name: z.string().nullable(),
                        createdAt: z.string(),
                        lastRequest: z.string().nullable(),
                        expiresAt: z.string().nullable()
                    }))
                }
            }
        },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal Server Error' }
    }
});

accountRouter.openapi(ListApiKeysRoute, async (c) => {
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const keys = await auth.api.listApiKeys({
        headers: c.req.raw.headers
    });

    return c.json(keys.map(key => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt.toISOString(),
        lastRequest: key.lastRequest?.toISOString() ?? null,
        expiresAt: key.expiresAt?.toISOString() ?? null
    })));
});

const RevokeApiKeyRoute = createRoute({
    operationId: 'revokeApiKey',
    method: 'post',
    path: '/revoke',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({
                        keyId: z.string()
                    })
                }
            }
        }
    },
    responses: {
        200: {
            description: 'API key revoked successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        success: z.boolean()
                    })
                }
            }
        },
        401: { description: 'Unauthorized' },
        500: { description: 'Internal Server Error' }
    }
});

accountRouter.openapi(RevokeApiKeyRoute, async (c) => {
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const { keyId } = c.req.valid('json');

    await auth.api.deleteApiKey({
        body: { keyId },
        headers: c.req.raw.headers
    });

    return c.json({
        success: true
    });
});

