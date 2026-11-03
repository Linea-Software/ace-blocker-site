import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { updateProExpiration } from '$lib/server/pro';
import { createLogger } from '$lib/server/logger';
import {
	assertLocalDevelopmentDatabase,
	resolveDevelopmentAdmin
} from '$lib/server/config/dev-admin';

const log = createLogger('seeder:user');

/**
 * Seed development fixtures only. Production administrator provisioning remains
 * an explicit operator action via scripts/provision-admin.ts.
 */
export async function seedDatabase() {
	if (!dev) return;

	// Guard before any reads/writes: fixture passwords must never reach a
	// remote DB, even when a dev bundle is accidentally started against one.
	assertLocalDevelopmentDatabase();
	const {
		email: adminEmail,
		username: adminUsername,
		password: adminPassword
	} = resolveDevelopmentAdmin();
	log.info('Seeding development users...');

	let adminUsers = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
	const adminAlreadyExists = adminUsers.length > 0;

	if (!adminAlreadyExists) {
		await auth.api.createUser({
			body: {
				name: adminUsername,
				email: adminEmail,
				password: adminPassword
			}
		});
		adminUsers = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
		log.info('Created development admin user');
	}

	const adminUser = adminUsers[0];
	if (!adminUser)
		throw new Error('[ACE DEV SEED ERROR] Development administrator was not created');

	await db
		.update(user)
		.set({
			role: 'admin',
			emailVerified: true
		})
		.where(eq(user.id, adminUser.id));
	await updateProExpiration(adminEmail, new Date('2099-01-01'));
	log.info(
		{ email: adminEmail, url: 'https://localhost:5173/signin' },
		adminAlreadyExists
			? 'Development admin ready (existing password unchanged)'
			: 'Development admin created (password configured via DEFAULT_ADMIN_PASSWORD)'
	);

	const proEmail = 'delivered+pro@resend.dev';
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
		const freeEmail = `delivered+user${i}@resend.dev`;
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
