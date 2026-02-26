import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { isUserPro } from '$lib/server/pro';
import { auth } from '$lib/server/auth';
import { HTTPException } from 'hono/http-exception';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';
import sitesLists from '$lib/server/data/sites-lists.json';

if (!env.BUNNY_SECURITY_KEY) {
    console.error("❌ BUNNY_SECURITY_KEY is missing in environment variables");
    throw new HTTPException(500, { message: "Internal Server Error" });
}

const SITES_LISTS_MAPPINGS = Object.fromEntries(
    sitesLists.map((list) => [
        list.id,
        { requiresPro: list.requires_pro }
    ])
)

const route = createRoute({
    operationId: 'getSitesListBackup',
    method: 'get',
    path: '/{siteListUuid}/backup',
    request: {
        params: z.object({
            siteListUuid: z.string().uuid().openapi({
                param: {
                    name: 'siteListUuid',
                    in: 'path'
                },
                example: '8bae9b21-f4ac-4355-b828-079ad857e2ea'
            })
        })
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        url: z.string()
                    })
                }
            },
            description: 'Download URL for sites list'
        },
        401: {
            description: 'Unauthorized'
        },
        403: {
            description: 'Forbidden (Pro required for premium lists)'
        },
        404: {
            description: 'File not found'
        },
        500: {
            description: 'Server error'
        }
    }
});

export const sitesListsRouter = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>()
    .openapi(route, async (c) => {
        const { siteListUuid } = c.req.valid('param');

        const mapping = SITES_LISTS_MAPPINGS[siteListUuid];

        if (!mapping) {
            throw new HTTPException(404, { message: "File not found" });
        }

        if (mapping.requiresPro) {
            const user = c.get('user');
            if (!user) {
                throw new HTTPException(401, { message: 'Unauthorized (Login required for pro lists)' });
            }

            const isPro = await isUserPro(user.email);
            if (!isPro) {
                throw new HTTPException(403, { message: "Pro license required for pro lists" });
            }

            const securityKey = env.BUNNY_SECURITY_KEY;
            const storagePath = `/premium/${siteListUuid}_bak.zip`;

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

            return c.json({ url: downloadUrl });
        } else {
            const downloadUrl = `https://cdn.aceblocker.com/free/${siteListUuid}_bak.zip`;
            return c.json({ url: downloadUrl });
        }
    });
