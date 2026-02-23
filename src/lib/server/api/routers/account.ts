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
    const session = await auth.api.getSession({
        headers: c.req.raw.headers
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
