import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { type Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { seedDatabase } from '$lib/server/seeder';
import { initializeCache } from '$lib/server/cache';

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

// Run seeder and initialize cache
seedDatabase();
initializeCache();
