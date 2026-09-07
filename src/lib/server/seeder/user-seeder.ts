import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { updateProExpiration } from '$lib/server/pro';
import { createLogger } from '$lib/server/logger';

const log = createLogger('seeder:user');

/**
 * Seed non-privileged development fixtures only. Production administrator
 * provisioning is an explicit operator action via scripts/provision-admin.ts.
 */
export async function seedDatabase() {
	if (!dev) return;

	log.info('Seeding development users...');

	const proEmail = 'pro@example.com';
	let proUser = await db.select().from(user).where(eq(user.email, proEmail)).limit(1);
	if (proUser.length === 0) {
		await auth.api.createUser({
			body: {
				name: 'Pro User',
				email: proEmail,
				password: 'password123'
			}
		});
		await db.update(user).set({ emailVerified: true }).where(eq(user.email, proEmail));
		await updateProExpiration(proEmail, new Date('2099-01-01'));
		log.info('Created development pro user');
	}

	for (let i = 1; i <= 5; i++) {
		const freeEmail = `user${i}@example.com`;
		const existingFree = await db.select().from(user).where(eq(user.email, freeEmail)).limit(1);
		if (existingFree.length === 0) {
			await auth.api.createUser({
				body: {
					name: `Free User ${i}`,
					email: freeEmail,
					password: 'password123'
				}
			});
			await db.update(user).set({ emailVerified: true }).where(eq(user.email, freeEmail));
		}
	}

	log.info('Development seeding complete.');
}
