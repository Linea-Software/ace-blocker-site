import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import type { Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { db } from '$lib/server/db';
import { resend } from '$lib/server/email';
import { eq } from 'drizzle-orm';
import { user } from '$lib/server/db/schema';

let hasCheckedAdmin = false;

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleAuth: Handle = async ({ event, resolve }) => {
	// ── One-time Admin Onboarding Check ──────────────────────────────────────
	if (!hasCheckedAdmin) {
		hasCheckedAdmin = true;
		const adminEmail = process.env.ADMIN_EMAIL;
		if (adminEmail) {
			try {
				const adminExists = await db.query.user.findFirst({
					where: (u, { eq }) => eq(u.email, adminEmail)
				});

				if (!adminExists) {
					console.log(`🚀 No admin found. Sending onboarding email to ${adminEmail}...`);
					await resend.emails.send({
						from: 'security@aceblocker.com',
						to: adminEmail,
						subject: 'Ace Blocker: Admin Setup Required',
						text: `Your Ace Blocker instance is live. Please go to ${event.url.origin}/signup and register with this exact email address to automatically claim your Admin account.`
					});
				} else if (!adminExists.twoFactorEnabled) {
					console.log(`🔒 Enforcing 2FA for existing admin: ${adminEmail}...`);
					await db.update(user).set({ twoFactorEnabled: true }).where(eq(user.email, adminEmail));
				}
			} catch (error) {
				console.error('❌ Hook Admin Check Error:', error);
			}
		}
	}

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
