import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { dodoPayments } from '$lib/server/auth';
import { HTTPException } from 'hono/http-exception';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

export const scriptsRouter = new Hono()
    .get(
        '/boredom',
        zValidator('query', z.object({
            licenseKey: z.string().min(1)
        })),
        async (c) => {
            const { licenseKey } = c.req.valid('query');
            const securityKey = env.BUNNY_SECURITY_KEY;
            const storagePath = "/boredom-scripts.zip";

            if (!securityKey) {
                console.error("❌ BUNNY_SECURITY_KEY is missing in environment variables");
                throw new HTTPException(500, { message: "Internal Server Error" });
            }

            try {
                // 1. Validate Dodo Payments license key
                const validation = await dodoPayments.licenses.validate({
                    license_key: licenseKey
                });

                if (!validation.valid) {
                    throw new HTTPException(403, { message: "Invalid or expired license key" });
                }
            } catch (e) {
                console.error('Error validating license:', e);
                if (e instanceof HTTPException) {
                    throw e;
                }
                if (e instanceof Error && 'status' in e && e.status === 403) {
                    throw new HTTPException(403, { message: "Invalid or expired license key" });
                }
                throw new HTTPException(500, { message: "Failed to validate license key" });
            }

            // 2. Generate BunnyCDN Token (10 minutes expiry)
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

            return c.text(downloadUrl);
        }
    );
