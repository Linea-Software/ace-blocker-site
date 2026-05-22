import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { type Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { seedDatabase } from '$lib/server/seeder';
import { initializeCache } from '$lib/server/cache';
import { logger } from '$lib/server/logger';
import crypto from 'crypto';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) => html.replace('%paraglide.lang%', locale)
		});
	});

const handleLogger: Handle = async ({ event, resolve }) => {
	const requestId = crypto.randomUUID().slice(0, 8);
	event.locals.log = logger.child({ requestId, path: event.url.pathname });
	return resolve(event);
};

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

export const handle: Handle = sequence(handleParaglide, handleLogger, handleAuth);

export async function init() {
	logger.info('Initializing application...');
	await seedDatabase();
	await initializeCache();
	logger.info('Application initialized');
}
