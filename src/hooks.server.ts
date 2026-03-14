import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { db } from '$lib/server/db';
import { resend } from '$lib/server/email';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';

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

	if (!email) {
		throw new Error('DEFAULT_ADMIN_EMAIL .env value not present');
	}
	if (!password) {
		throw new Error('DEFAULT_ADMIN_PASSWORD .env value not present');
	}
	if (!username) {
		throw new Error('DEFAULT_ADMIN_NAME .env value not present');
	}

	const existing = await db.select().from(user).where(eq(user.email, email));

	if (existing.length > 0) {
		console.log("[SETUP] Admin user already exists.")
		return;
	}

	await auth.api.createUser({
		body: {
			name: username,
			email: email,
			password: password
		}
	});

	await db.update(user).set({ role: 'admin', emailVerified: true }).where(eq(user.email, email));

	console.log("[SETUP] Admin created with default .env credentials")
})();
