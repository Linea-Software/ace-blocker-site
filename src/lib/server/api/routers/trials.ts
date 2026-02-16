import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { db } from '$lib/server/db';
import { pcTrials } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';

// Route Definition: Check if PC used trial
const checkRoute = createRoute({
    method: 'get',
    path: '/check/:pcId',
    request: {
        params: z.object({
            pcId: z.string().min(1).openapi({
                param: { name: 'pcId', in: 'path' },
                example: 'hwid-12345'
            })
        })
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({ used: z.boolean() })
                }
            },
            description: 'Trial usage status'
        },
        500: {
            description: 'Server error'
        }
    }
});

// Route Definition: Flag PC as used trial
const flagRoute = createRoute({
    method: 'post',
    path: '/flag',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: z.object({
                        pcId: z.string().min(1).openapi({ example: 'hwid-12345' })
                    })
                }
            }
        }
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({ success: z.boolean() })
                }
            },
            description: 'PC flagged successfully'
        },
        500: {
            description: 'Server error'
        }
    }
});

export const trialsRouter = new OpenAPIHono()
    .openapi(checkRoute, async (c) => {
        const { pcId } = c.req.valid('param');
        try {
            const existing = await db.query.pcTrials.findFirst({
                where: eq(pcTrials.pcIdentifier, pcId)
            });
            return c.json({ used: !!existing });
        } catch (e) {
            console.error('Error checking trial status:', e);
            throw new HTTPException(500, { message: 'Failed to check trial status' });
        }
    })
    .openapi(flagRoute, async (c) => {
        const { pcId } = c.req.valid('json');
        try {
            // Check existence first to be idempotent
            const existing = await db.query.pcTrials.findFirst({
                where: eq(pcTrials.pcIdentifier, pcId)
            });

            if (!existing) {
                await db.insert(pcTrials).values({ pcIdentifier: pcId });
            }

            return c.json({ success: true });
        } catch (e) {
            console.error('Error flagging PC:', e);
            throw new HTTPException(500, { message: 'Failed to flag PC' });
        }
    });
