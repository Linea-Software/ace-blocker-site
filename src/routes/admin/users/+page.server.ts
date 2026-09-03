import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { proStatus, user } from '$lib/server/db/schema';

import { count, eq, gt, ilike, or } from 'drizzle-orm';

function countValue(value: number | string | bigint | null | undefined): number {
	return Number(value ?? 0);
}

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search');
	const now = new Date();

	const [users, [totalRow], [bannedRow], [adminRow], [proRow]] = await Promise.all([
		db.query.user.findMany({
			where: search
				? or(ilike(user.email, `%${search}%`), ilike(user.name, `%${search}%`))
				: undefined,
			limit: 100,
			with: {
				proStatus: true
			}
		}),
		db.select({ value: count() }).from(user),
		db.select({ value: count() }).from(user).where(eq(user.banned, true)),
		db.select({ value: count() }).from(user).where(eq(user.role, 'admin')),
		db.select({ value: count() }).from(proStatus).where(gt(proStatus.expiration, now))
	]);

	const total = countValue(totalRow?.value);
	const banned = countValue(bannedRow?.value);

	return {
		summary: {
			total,
			active: Math.max(0, total - banned),
			pro: countValue(proRow?.value),
			admins: countValue(adminRow?.value)
		},
		users: users.map((u) => ({
			...u,
			proExpiration: u.proStatus?.expiration,
			proStatusCachedAt: u.proStatus?.cachedAt
		}))
	};
};
