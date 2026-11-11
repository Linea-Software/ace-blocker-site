import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, lt, or } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { deviceLinks } from '$lib/server/db/schema';
import { auth } from '$lib/server/auth';

export const DEVICE_LINK_TTL_SECONDS = 600;
export const DEVICE_LINK_POLL_SECONDS = 5;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A desktop-secret and a separate high-entropy user-confirmation code. */
export function hashLinkCode(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}
export function normalizeUserCode(value: string): string | null {
	const code = value.replace(/[\s-]/g, '').toUpperCase();
	return /^[A-HJ-NP-Z2-9]{12}$/.test(code) ? code : null;
}
export function newUserCode(): string {
	const code = Array.from(randomBytes(12), (byte) => ALPHABET[byte & 31]).join('');
	return `${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8)}`;
}

export async function createDeviceLink() {
	// Opportunistic expiry cleanup bounds growth across successive device attempts.
	// Older records hold only hashes; cleanup is best-effort and indexed by expiresAt.
	await db
		.delete(deviceLinks)
		.where(lt(deviceLinks.expiresAt, new Date(Date.now() - 86_400_000)));
	const deviceCode = randomBytes(32).toString('base64url');
	const userCode = newUserCode();
	await db.insert(deviceLinks).values({
		deviceCodeHash: hashLinkCode(deviceCode),
		userCodeHash: hashLinkCode(normalizeUserCode(userCode)!),
		expiresAt: new Date(Date.now() + DEVICE_LINK_TTL_SECONDS * 1000)
	});
	return {
		deviceCode,
		userCode,
		expiresIn: DEVICE_LINK_TTL_SECONDS,
		interval: DEVICE_LINK_POLL_SECONDS
	};
}

export async function approveDeviceLink(value: string, userId: string): Promise<boolean> {
	const code = normalizeUserCode(value);
	if (!code) return false;
	const rows = await db
		.update(deviceLinks)
		.set({ status: 'approved', approvedUserId: userId })
		.where(
			and(
				eq(deviceLinks.userCodeHash, hashLinkCode(code)),
				eq(deviceLinks.status, 'pending'),
				gt(deviceLinks.expiresAt, new Date())
			)
		)
		.returning({ digest: deviceLinks.deviceCodeHash });
	return rows.length === 1;
}

export type DevicePollResult =
	| { state: 'pending' | 'slow_down'; retryAfter: number }
	| { state: 'expired' | 'consumed' }
	| { state: 'authorized'; apiKey: string };

export async function pollDeviceLink(deviceCode: string): Promise<DevicePollResult> {
	if (!/^[A-Za-z0-9_-]{43}$/.test(deviceCode)) return { state: 'expired' };
	const digest = hashLinkCode(deviceCode);
	const now = new Date();
	const row = await db.query.deviceLinks.findFirst({
		where: eq(deviceLinks.deviceCodeHash, digest)
	});
	if (!row || row.expiresAt <= now) return { state: 'expired' };
	if (row.status === 'consumed' || row.status === 'redeeming') return { state: 'consumed' };
	if (row.status === 'pending') {
		const cutoff = new Date(now.getTime() - DEVICE_LINK_POLL_SECONDS * 1000);
		const updated = await db
			.update(deviceLinks)
			.set({ lastPolledAt: now })
			.where(
				and(
					eq(deviceLinks.deviceCodeHash, digest),
					eq(deviceLinks.status, 'pending'),
					or(isNull(deviceLinks.lastPolledAt), lt(deviceLinks.lastPolledAt, cutoff))
				)
			)
			.returning({ digest: deviceLinks.deviceCodeHash });
		return updated.length
			? { state: 'pending', retryAfter: DEVICE_LINK_POLL_SECONDS }
			: { state: 'slow_down', retryAfter: DEVICE_LINK_POLL_SECONDS + 2 };
	}
	// Atomic redemption: only one request can transition approved -> redeeming.
	const claimed = await db
		.update(deviceLinks)
		.set({ status: 'redeeming' })
		.where(
			and(
				eq(deviceLinks.deviceCodeHash, digest),
				eq(deviceLinks.status, 'approved'),
				gt(deviceLinks.expiresAt, now)
			)
		)
		.returning({ userId: deviceLinks.approvedUserId });
	if (claimed.length !== 1 || !claimed[0].userId) return { state: 'consumed' };
	try {
		const isDev = process.env.NODE_ENV === 'development';
		const issued = await auth.api.createApiKey({
			body: {
				name: 'Desktop (device link)',
				userId: claimed[0].userId,
				rateLimitEnabled: !isDev,
				rateLimitMax: 1000,
				rateLimitTimeWindow: 3600000
			}
		});
		await db
			.update(deviceLinks)
			.set({ status: 'consumed', consumedAt: new Date() })
			.where(eq(deviceLinks.deviceCodeHash, digest));
		return { state: 'authorized', apiKey: issued.key };
	} catch {
		// Never replay a possibly minted key after an uncertain delivery.
		await db
			.update(deviceLinks)
			.set({ status: 'consumed', consumedAt: new Date() })
			.where(eq(deviceLinks.deviceCodeHash, digest));
		return { state: 'consumed' };
	}
}
