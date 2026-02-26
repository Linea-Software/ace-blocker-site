import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, desc } from 'drizzle-orm';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { backups } from '$lib/server/db/schema';
import { isUserPro } from '$lib/server/pro';
import { HTTPException } from 'hono/http-exception';
import { v7 as uuidv7 } from 'uuid';

const BackupSitesListSourceSchema = z.object({
    source: z.string(),
    sourceType: z.string(),
    format: z.string()
}).openapi('BackupSitesListSource');

const BackupSitesListSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    sources: z.array(BackupSitesListSourceSchema)
}).openapi('BackupSitesList');

const BackupScheduleEntrySchema = z.object({
    startTime: z.string(),
    endTime: z.string(),
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
    sunday: z.boolean()
}).openapi('BackupScheduleEntry');

const BackupNetworkBlockSchema = z.object({
    id: z.string().uuid(),
    name: z.string(),
    schedules: z.array(BackupScheduleEntrySchema),
    userRules: z.array(z.string()),
    connectedSitesLists: z.array(z.string().uuid())
}).openapi('BackupNetworkBlock');

const EngineBackupSchema = z.object({
    version: z.string(),
    customSitesLists: z.array(BackupSitesListSchema),
    networkBlocks: z.array(BackupNetworkBlockSchema),
    deactivatedBoredomScripts: z.array(z.string())
}).openapi('EngineBackup');

const createBackupRoute = createRoute({
    operationId: 'createBackup',
    method: 'post',
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
        }),
        body: {
            content: {
                'application/json': {
                    schema: EngineBackupSchema
                }
            }
        }
    },
    responses: {
        200: {
            description: 'Backup saved successfully',
            content: {
                'application/json': {
                    schema: z.object({
                        id: z.string().uuid()
                    })
                }
            }
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden (Pro required)' },
        413: { description: 'Payload too large (max 1MB)' },
        500: { description: 'Internal Server Error' }
    }
});

const fetchBackupRoute = createRoute({
    operationId: 'fetchBackup',
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
            description: 'Latest backup retrieved successfully',
            content: {
                'application/json': {
                    schema: EngineBackupSchema
                }
            }
        },
        401: { description: 'Unauthorized' },
        403: { description: 'Forbidden (Pro required)' },
        404: { description: 'Backup not found' },
        500: { description: 'Internal Server Error' }
    }
});

export const backupsRouter = new OpenAPIHono<{
    Variables: {
        user: typeof auth.$Infer.Session.user | null;
        session: typeof auth.$Infer.Session.session | null;
    }
}>();

backupsRouter.openapi(createBackupRoute, async (c) => {
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const isPro = await isUserPro(user.email);
    if (!isPro) {
        throw new HTTPException(403, { message: 'Pro license required' });
    }

    // Check payload size
    const contentLength = c.req.header('content-length');
    if (contentLength && parseInt(contentLength) > 1024 * 1024) {
        throw new HTTPException(413, { message: 'Backup size exceeds 1MB' });
    }

    const validatedData = c.req.valid('json');

    const backupId = uuidv7();
    await db.insert(backups).values({
        id: backupId,
        userId: user.id,
        data: JSON.stringify(validatedData),
        version: validatedData.version,
        createdAt: new Date()
    });

    return c.json({ id: backupId });
});

backupsRouter.openapi(fetchBackupRoute, async (c) => {
    const user = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Unauthorized' });
    }

    const isPro = await isUserPro(user.email);
    if (!isPro) {
        throw new HTTPException(403, { message: 'Pro license required' });
    }

    const [latestBackup] = await db
        .select()
        .from(backups)
        .where(eq(backups.userId, user.id))
        .orderBy(desc(backups.createdAt))
        .limit(1);

    if (!latestBackup) {
        throw new HTTPException(404, { message: 'No backup found' });
    }

    return c.json(JSON.parse(latestBackup.data));
});
