import { sequence } from '@sveltejs/kit/hooks';
import { auth } from '$lib/server/auth';
import { type Handle } from '@sveltejs/kit';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { seedDatabase, seedPrices } from '$lib/server/seeder';
import { initializeCache } from '$lib/server/cache';
import { logger } from '$lib/server/logger';
import { app } from '$lib/server/api/app';
import { db } from '$lib/server/db';
import { siteVisits } from '$lib/server/db/schema';
import crypto from 'crypto';
import { v7 as uuidv7 } from 'uuid';
import { dev } from '$app/environment';
import { assertProductionEnvironment } from '$lib/server/config/production';
import { assertDevelopmentEnvironment } from '$lib/server/config/development';
import { assertLocalDevelopmentDatabase } from '$lib/server/config/dev-admin';
import { startAceHostsSitePackSync, syncAceHostsSitePacks } from '$lib/server/ace-hosts-site-packs';

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

// Bypass SvelteKit body parsing for API routes. SvelteKit internally calls
// request.formData() on multipart requests before reaching fallback handlers,
// which drains the body stream. We intercept early and forward to Elysia directly.
const handleApi: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/api')) {
		return app.handle(event.request);
	}
	return resolve(event);
};

// Track marketing page visits (excludes API, auth, admin, and dev routes)
const handleTrackVisits: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;

	// Only track public marketing/content pages
	const isPublicPage =
		!pathname.startsWith('/api') &&
		!pathname.startsWith('/admin') &&
		!pathname.startsWith('/account') &&
		!pathname.startsWith('/signin') &&
		!pathname.startsWith('/signup') &&
		!pathname.startsWith('/forgot-password') &&
		!pathname.startsWith('/checkout') &&
		!pathname.startsWith('/dev') &&
		!pathname.startsWith('/download') &&
		!pathname.includes('.'); // Skip static files (favicon, robots.txt, etc.)

	if (isPublicPage) {
		// Fire-and-forget the DB insert
		db.insert(siteVisits)
			.values({
				id: uuidv7(),
				path: pathname,
				referrer: event.request.headers.get('referer') ?? undefined
			})
			.catch(() => {}); // Silently ignore insert errors
	}

	return resolve(event);
};

export const handle: Handle = sequence(
	handleApi,
	handleParaglide,
	handleTrackVisits,
	handleLogger,
	handleAuth
);

export async function init() {
	logger.info('Initializing application...');
	if (dev) {
		assertDevelopmentEnvironment();
		assertLocalDevelopmentDatabase();
	} else assertProductionEnvironment();
	await seedPrices(); // creates Dodo products and populates the checkout plugin's product list
	await seedDatabase();
	if (!dev) {
		try {
			await syncAceHostsSitePacks();
		} catch (error) {
			logger.error({ err: error }, 'Initial ace-hosts site-pack synchronization failed');
		}
	}
	await initializeCache();
	if (!dev) startAceHostsSitePackSync();
	logger.info('Application initialized');
}
