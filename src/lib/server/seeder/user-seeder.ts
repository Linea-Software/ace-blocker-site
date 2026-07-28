import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user, twoFactor } from '$lib/server/db/schema';
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
			// Ensure admin role and verified status (these are safe to set directly)
			await db
				.update(user)
				.set({
					role: 'admin',
					emailVerified: true
				})
				.where(eq(user.id, adminRecord.id));

			// Enable 2FA properly via the Better Auth API.
			// The API creates the required two_factor record (secret + backup codes)
			// that verifyOtp checks for. Setting twoFactorEnabled directly in the
			// DB without a two_factor record causes "Two factor isn't enabled" errors.
			const existingTwoFactor = await db
				.select()
				.from(twoFactor)
				.where(eq(twoFactor.userId, adminRecord.id))
				.limit(1);

			if (existingTwoFactor.length === 0) {
				// If a previous (buggy) seeder run set twoFactorEnabled without
				// creating the two_factor record, reset the flag temporarily so
				// sign-in does not trigger a 2FA challenge before 2FA is set up.
				if (adminRecord.twoFactorEnabled) {
					await db
						.update(user)
						.set({ twoFactorEnabled: false })
						.where(eq(user.id, adminRecord.id));
				}

				// Sign in to obtain session cookies required by enableTwoFactor
				const signInResult = await auth.api.signInEmail({
					body: {
						email: adminEmail,
						password: adminPassword
					},
					returnHeaders: true
				});

				// Enable 2FA with the session.
				// skipVerificationOnEnable: true in the plugin config ensures
				// twoFactorEnabled is set to true immediately.
				await auth.api.enableTwoFactor({
					body: {
						password: adminPassword
					},
					headers: signInResult.headers
				});

				console.log('[SEEDER] 2FA properly enabled for admin');
			} else if (!adminRecord.twoFactorEnabled) {
				// two_factor record exists but user flag is out of sync
				await db
					.update(user)
					.set({ twoFactorEnabled: true })
					.where(eq(user.id, adminRecord.id));
			}

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
