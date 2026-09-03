import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { backups, proStatus, session, siteVisits, user } from '$lib/server/db/schema';
import { and, count, desc, eq, gt, gte, lt, sql } from 'drizzle-orm';

type DailyCountRow = { day: string; value: number | string };

const DAY_MS = 24 * 60 * 60 * 1000;

function countValue(value: number | string | bigint | null | undefined): number {
	return Number(value ?? 0);
}

function fillDailySeries(rows: DailyCountRow[], days: number) {
	const countsByDay = new Map(rows.map((row) => [row.day, countValue(row.value)]));
	return Array.from({ length: days }, (_, index) => {
		const date = new Date(Date.now() - (days - index - 1) * DAY_MS);
		const day = date.toISOString().slice(0, 10);
		return { day, value: countsByDay.get(day) ?? 0 };
	});
}

function percentage(part: number, whole: number): number {
	return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

export const load: PageServerLoad = async () => {
	const now = new Date();
	const sevenDaysAgo = new Date(now.getTime() - 7 * DAY_MS);
	const fourteenDaysAgo = new Date(now.getTime() - 13 * DAY_MS);
	const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
	const sixtyDaysAgo = new Date(now.getTime() - 60 * DAY_MS);

	const visitDay = sql<string>`to_char(date_trunc('day', ${siteVisits.timestamp}), 'YYYY-MM-DD')`;
	const signupDay = sql<string>`to_char(date_trunc('day', ${user.createdAt}), 'YYYY-MM-DD')`;

	const [
		[totalUsersRow],
		[proUsersRow],
		[verifiedUsersRow],
		[twoFactorUsersRow],
		[activeSessionsRow],
		[cloudBackupsRow],
		[totalVisitsRow],
		[weeklyVisitsRow],
		[monthlyVisitsRow],
		[previousMonthlyVisitsRow],
		[weeklySignupsRow],
		[monthlySignupsRow],
		topPages,
		visitSeriesRows,
		signupSeriesRows,
		recentUsers
	] = await Promise.all([
		db.select({ value: count() }).from(user),
		db.select({ value: count() }).from(proStatus).where(gt(proStatus.expiration, now)),
		db.select({ value: count() }).from(user).where(eq(user.emailVerified, true)),
		db.select({ value: count() }).from(user).where(eq(user.twoFactorEnabled, true)),
		db.select({ value: count() }).from(session).where(gt(session.expiresAt, now)),
		db.select({ value: count() }).from(backups),
		db.select({ value: count() }).from(siteVisits),
		db
			.select({ value: count() })
			.from(siteVisits)
			.where(gte(siteVisits.timestamp, sevenDaysAgo)),
		db
			.select({ value: count() })
			.from(siteVisits)
			.where(gte(siteVisits.timestamp, thirtyDaysAgo)),
		db
			.select({ value: count() })
			.from(siteVisits)
			.where(
				and(
					gte(siteVisits.timestamp, sixtyDaysAgo),
					lt(siteVisits.timestamp, thirtyDaysAgo)
				)
			),
		db.select({ value: count() }).from(user).where(gte(user.createdAt, sevenDaysAgo)),
		db.select({ value: count() }).from(user).where(gte(user.createdAt, thirtyDaysAgo)),
		db
			.select({ path: siteVisits.path, visits: count() })
			.from(siteVisits)
			.where(gte(siteVisits.timestamp, thirtyDaysAgo))
			.groupBy(siteVisits.path)
			.orderBy(desc(count()))
			.limit(6),
		db
			.select({ day: visitDay, value: count() })
			.from(siteVisits)
			.where(gte(siteVisits.timestamp, fourteenDaysAgo))
			.groupBy(visitDay)
			.orderBy(visitDay),
		db
			.select({ day: signupDay, value: count() })
			.from(user)
			.where(gte(user.createdAt, fourteenDaysAgo))
			.groupBy(signupDay)
			.orderBy(signupDay),
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				createdAt: user.createdAt,
				emailVerified: user.emailVerified,
				role: user.role,
				proExpiration: proStatus.expiration
			})
			.from(user)
			.leftJoin(proStatus, eq(proStatus.userId, user.id))
			.orderBy(desc(user.createdAt))
			.limit(6)
	]);

	const totalUsers = countValue(totalUsersRow?.value);
	const proUsers = countValue(proUsersRow?.value);
	const verifiedUsers = countValue(verifiedUsersRow?.value);
	const twoFactorUsers = countValue(twoFactorUsersRow?.value);
	const activeSessions = countValue(activeSessionsRow?.value);
	const cloudBackups = countValue(cloudBackupsRow?.value);
	const monthlyVisits = countValue(monthlyVisitsRow?.value);
	const previousMonthlyVisits = countValue(previousMonthlyVisitsRow?.value);

	return {
		summary: {
			totalUsers,
			proUsers,
			monthlyVisits,
			monthlySignups: countValue(monthlySignupsRow?.value),
			weeklyVisits: countValue(weeklyVisitsRow?.value),
			weeklySignups: countValue(weeklySignupsRow?.value),
			totalVisits: countValue(totalVisitsRow?.value),
			visitTrend:
				previousMonthlyVisits > 0
					? Math.round(
							((monthlyVisits - previousMonthlyVisits) / previousMonthlyVisits) * 100
						)
					: monthlyVisits > 0
						? 100
						: 0
		},
		health: {
			verifiedUsers,
			verifiedRate: percentage(verifiedUsers, totalUsers),
			twoFactorUsers,
			twoFactorRate: percentage(twoFactorUsers, totalUsers),
			cloudBackups,
			cloudBackupRate: percentage(cloudBackups, totalUsers),
			activeSessions,
			proConversionRate: percentage(proUsers, totalUsers)
		},
		activity: {
			visits: fillDailySeries(visitSeriesRows, 14),
			signups: fillDailySeries(signupSeriesRows, 14)
		},
		topPages: topPages.map((page) => ({ path: page.path, visits: countValue(page.visits) })),
		recentUsers: recentUsers.map((recentUser) => ({
			...recentUser,
			isPro: Boolean(recentUser.proExpiration && recentUser.proExpiration > now)
		}))
	};
};
