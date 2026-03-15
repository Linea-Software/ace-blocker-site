import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { db } from '$lib/server/db';
import { resend } from '$lib/server/email';
import { eq } from 'drizzle-orm';
import { user, proStatus } from '$lib/server/db/schema';
import crypto from 'crypto';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	const session = await auth.api.getSession({
		headers: event.request.headers
	});

	// Make session and user available on server
	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	} else {
		event.locals.session = null;
		event.locals.user = null;
	}

	return resolve(event);
};

export const handle: Handle = sequence(handleParaglide, handleAuth);

// ADMIN USER SETUP

(async () => {
	console.log('[SETUP] checking for admin user...');

	const email = process.env.DEFAULT_ADMIN_EMAIL;
	const password = process.env.DEFAULT_ADMIN_PASSWORD;
	const username = process.env.DEFAULT_ADMIN_USERNAME;

	if (!email || !password || !username) {
		console.warn('[SETUP] Admin credentials not fully configured in .env');
		return;
	}

	let existing = await db.select().from(user).where(eq(user.email, email)).limit(1);

	if (existing.length === 0) {
		await auth.api.createUser({
			body: {
				name: username,
				email: email,
				password: password
			}
		});
		console.log('[SETUP] Admin created with default .env credentials');
		existing = await db.select().from(user).where(eq(user.email, email)).limit(1);
	}

	const admin = existing[0];
	if (admin) {
		// Ensure admin role and verified status
		await db
			.update(user)
			.set({ role: 'admin', emailVerified: true })
			.where(eq(user.id, admin.id));

		// Automatically make admin a pro user by ensuring a record exists in proStatus
		await db
			.insert(proStatus)
			.values({
				id: crypto.randomUUID(),
				userId: admin.id,
				expiration: new Date('2099-01-01'),
				cachedAt: new Date()
			})
			.onConflictDoUpdate({
				target: proStatus.userId,
				set: {
					expiration: new Date('2099-01-01'),
					cachedAt: new Date()
				}
			});

		console.log('[SETUP] Admin role and pro status ensured.');
	}
})();
