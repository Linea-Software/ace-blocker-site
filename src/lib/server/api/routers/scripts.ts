import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { dodoPayments } from '$lib/server/auth';
import { HTTPException } from 'hono/http-exception';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

if (!env.BUNNY_SECURITY_KEY) {
    console.error("❌ BUNNY_SECURITY_KEY is missing in environment variables");
    throw new HTTPException(500, { message: "Internal Server Error" });
}

const route = createRoute({
    operationId: 'getBoredomScripts',
    method: 'get',
    path: '/boredom',
    request: {
        query: z.object({
            licenseKey: z.string().min(1).openapi({
                param: {
                    name: 'licenseKey',
                    in: 'query'
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
                        url: z.string(),
                        version: z.string()
                    })
                }
            },
            description: 'Download URL and version for boredom scripts'
        },
        403: {
            description: 'Invalid or expired license key'
        },
        500: {
            description: 'Server error'
        }
    }
});

export const scriptsRouter = new OpenAPIHono()
    .openapi(route, async (c) => {
        const { licenseKey } = c.req.valid('query');
        const securityKey = env.BUNNY_SECURITY_KEY;
        const storagePath = "/premium/boredom-scripts.zip";

        try {
            const validation = await dodoPayments.licenses.validate({
                license_key: licenseKey
            });

            if (!validation.valid) {
                throw new HTTPException(403, { message: "Invalid or expired license key" });
            }
        } catch (e) {
            if (e instanceof HTTPException) {
                throw e;
            }
            if (e instanceof Error && 'status' in e && e.status === 403) {
                throw new HTTPException(403, { message: "Invalid or expired license key" });
            }
            throw new HTTPException(500, { message: "Failed to validate license key" });
        }

        const expires = Math.round(Date.now() / 1000) + 600;
        const hashableBase = securityKey + storagePath + expires;

        const token = crypto
            .createHash("sha256")
            .update(hashableBase)
            .digest("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=/g, "");

        const downloadUrl = `https://cdn.aceblocker.com${storagePath}?token=${token}&expires=${expires}`;

        return c.json({ url: downloadUrl, version: '0.1.0' });
    });
