import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
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
    security: [
        {
            APIKeyHeader: []
        }
    ],
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
        401: {
            description: 'Unauthorized'
        },
        403: {
            description: 'Forbidden (Pro required)'
        },
        500: {
            description: 'Server error'
        }
    }
});

export const scriptsRouter = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>()
    .openapi(route, async (c) => {
        const user = c.get('user');
        if (!user) {
            throw new HTTPException(401, { message: 'Unauthorized' });
        }

        const isPro = await isUserPro(user.email);
        if (!isPro) {
            throw new HTTPException(403, { message: 'Pro license required' });
        }

        const securityKey = env.BUNNY_SECURITY_KEY;
        const storagePath = "/premium/boredom-scripts.zip";

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
