import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { dodoPayments } from '$lib/server/auth';
import { HTTPException } from 'hono/http-exception';

const route = createRoute({
    method: 'get',
    path: '/:key',
    request: {
        params: z.object({
            key: z.string().min(1).openapi({
                param: {
                    name: 'key',
                    in: 'path'
                },
                example: '12345'
            })
        })
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        valid: z.boolean(),
                        // Allow other fields to pass through without strict validation for now
                    }).loose()
                }
            },
            description: 'License validation result'
        },
        500: {
            description: 'Failed to validate license'
        }
    }
});

export const licenseRouter = new OpenAPIHono()
    .openapi(route, async (c) => {
        const { key } = c.req.valid('param');

        try {
            const result = await dodoPayments.licenses.validate({
                license_key: key
            });

            return c.json(result);
        } catch (e) {
            console.error('Error validating license:', e);
            throw new HTTPException(500, { message: 'Failed to validate license' });
        }
    });

