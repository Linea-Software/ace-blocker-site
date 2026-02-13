import { auth, dodoPayments } from "$lib/server/auth";
import { error } from "@sveltejs/kit";
import crypto from "crypto";
import { env } from "$env/dynamic/private";

const securityKey = env.BUNNY_SECURITY_KEY;
const storagePath = "/boredom-scripts.zip";

export const GET = async ({ request }) => {
    // 1. Authenticate user
    const session = await auth.api.getSession({
        headers: request.headers
    });

    if (!session) {
        throw error(401, "Unauthorized - Please sign in");
    }

    // 2. Check for paid Dodo Payments license
    // We'll check if the user has any active subscriptions or licenses
    const subscriptionsResponse = await dodoPayments.subscriptions.list({
        customer_id: session.user.id
    });

    const hasActiveSubscription = subscriptionsResponse.items.some((subscription) => subscription.status === 'active');

    if (!hasActiveSubscription) {
        throw error(403, "Payment Required - This feature requires an active Pro subscription");
    }

    if (!securityKey) {
        console.error("❌ BUNNY_SECURITY_KEY is missing in environment variables");
        throw error(500, "Internal Server Error");
    }

    // 3. Generate BunnyCDN Token (10 minutes expiry)
    const expires = Math.round(Date.now() / 1000) + 600;
    const hashableBase = securityKey + storagePath + expires;

    // BunnyCDN usually uses MD5 or SHA256 depending on zone settings.
    // You indicated sha256 in your snippet.
    const token = crypto
        .createHash("sha256")
        .update(hashableBase)
        .digest("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

    const url = `https://cdn.aceblocker.com${storagePath}?token=${token}&expires=${expires}`;

    return new Response(url);
};