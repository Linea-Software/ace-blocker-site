import { dodoPayments } from "$lib/server/auth";
import { error } from "@sveltejs/kit";
import crypto from "crypto";
import { env } from "$env/dynamic/private";

const securityKey = env.BUNNY_SECURITY_KEY;
const storagePath = "/boredom-scripts.zip";

export const GET = async ({ url }) => {
    const licenceKey = url.searchParams.get('licenceKey');

    if (!licenceKey) {
        throw error(400, "Missing licenceKey query parameter");
    }

    // 1. Validate Dodo Payments license key
    try {
        const validation = await dodoPayments.licenses.validate({
            license_key: licenceKey
        });

        if (!validation.valid) {
            throw error(403, "Invalid or expired license key");
        }
    } catch (e) {
        console.error('Error validating license:', e);
        if (e instanceof Error && 'status' in e && e.status === 403) {
            throw error(403, "Invalid or expired license key");
        }
        throw error(500, "Failed to validate license key");
    }

    if (!securityKey) {
        console.error("❌ BUNNY_SECURITY_KEY is missing in environment variables");
        throw error(500, "Internal Server Error");
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

    return new Response(downloadUrl);
};