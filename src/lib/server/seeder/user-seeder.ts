import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import { updateProExpiration } from '$lib/server/pro';

export async function seedDatabase() {
	console.log('[SEEDER] checking for admin user...');

	const adminEmail = process.env.DEFAULT_ADMIN_EMAIL;
	const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
	const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;

	if (adminEmail && adminPassword && adminUsername) {
		let existingAdmin = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);

		if (existingAdmin.length === 0) {
			await auth.api.createUser({
				body: {
					name: adminUsername,
					email: adminEmail,
					password: adminPassword
				}
			});
			console.log('[SEEDER] Admin created with default .env credentials');
			existingAdmin = await db.select().from(user).where(eq(user.email, adminEmail)).limit(1);
		}

		const adminRecord = existingAdmin[0];
		if (adminRecord) {
			// Ensure admin role, verified status, and 2FA
			await db
				.update(user)
				.set({
					role: 'admin',
					emailVerified: true,
					twoFactorEnabled: true
				})
				.where(eq(user.id, adminRecord.id));

			// Automatically make admin a pro user
			await updateProExpiration(adminEmail, new Date('2099-01-01'));
			console.log('[SEEDER] Admin role, verified status and 2FA ensured.');
		}
	} else {
		console.warn('[SEEDER] Admin credentials not fully configured in .env');
	}

	// Only seed extra users in dev mode
	if (!dev) return;

	console.log('[SEEDER] Seeding development users...');

	// Create a dedicated Pro user
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
		console.log('[SEEDER] Created pro user: pro@example.com');
	}

	// Create a bunch of free users
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
			console.log(`[SEEDER] Created free user: ${freeEmail}`);
		}
	}

	console.log('[SEEDER] Development seeding complete.');
}
