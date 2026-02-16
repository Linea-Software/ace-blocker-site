import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { dodoPayments } from '$lib/server/auth';
import { HTTPException } from 'hono/http-exception';

export const licenseRouter = new Hono()
    .get(
        '/:key',
        zValidator('param', z.object({
            key: z.string().min(1)
        })),
        async (c) => {
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
        }
    );
