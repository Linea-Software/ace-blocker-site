import type { StartMiddleware } from '@solidjs/vite-plugin';
import { createAPIHandler } from 'filesystem-routing/api';
import routes from 'virtual:file-routes';
import { paraglideMiddleware } from '$lib/paraglide/server';
import { initializeSite } from '$lib/server/bootstrap';
import { app } from '$lib/server/api/app';
import { db } from '$lib/server/db';
import { siteVisits } from '$lib/server/db/schema';
import { logger } from '$lib/server/logger';
import { v7 as uuidv7 } from 'uuid';
import { basePath, isIndexablePage, localeFromPath, localizedPath } from '$lib/seo';

import { auth } from '$lib/server/auth';
import { canonicalRequest } from '$lib/server/request-origin';

const apiRoutes = createAPIHandler(routes);

function safeReferrer(header: string | null): string | undefined {
	if (!header) return;
	try {
		const url = new URL(header);
		// Analytics may store referrer origins only; paths/query/hash could
		// contain private account and checkout state.
		return url.origin;
	} catch {
		return;
	}
}

const siteMiddleware: StartMiddleware = async (event, next) => {
	if (import.meta.env.PROD) {
		const canonical = canonicalRequest(
			event.request,
			process.env.ORIGIN ?? 'https://invalid.invalid'
		);
		if (!canonical) return new Response('Invalid host', { status: 400 });
		event.request = canonical;
	}
	await initializeSite();
	const url = new URL(event.request.url);
	const pathname = url.pathname;
	const canonicalPath = basePath(pathname);
	// A former SvelteKit development-only layout rejected this subtree in
	// production. Preserve that server-side invariant before route dispatch.
	if (import.meta.env.PROD && (canonicalPath === '/dev' || canonicalPath.startsWith('/dev/'))) {
		return new Response('Not found', { status: 404 });
	}
	if (
		(pathname === '/api' || pathname.startsWith('/api/')) &&
		!pathname.startsWith('/api/device-link/')
	) {
		return app.handle(event.request);
	}
	// Authorize private document requests before streaming any HTML.
	if (
		event.request.method === 'GET' &&
		(canonicalPath === '/account' ||
			canonicalPath === '/checkout' ||
			canonicalPath === '/checkout/completed' ||
			canonicalPath === '/admin' ||
			canonicalPath.startsWith('/admin/'))
	) {
		const session = await auth.api.getSession({ headers: event.request.headers });
		const locale = localeFromPath(pathname);
		let destination: URL | undefined;
		if (canonicalPath === '/admin' || canonicalPath.startsWith('/admin/')) {
			if (
				!session?.user ||
				session.user.role !== 'admin' ||
				event.request.headers.has('x-api-key') ||
				event.request.headers.has('authorization')
			)
				destination = new URL(localizedPath('/', locale), url);
			else if (canonicalPath === '/admin')
				destination = new URL(localizedPath('/admin/dashboard', locale), url);
		} else if (!session?.user) {
			destination = new URL(localizedPath('/signin', locale), url);
			if (canonicalPath === '/checkout')
				destination.searchParams.set('redirectTo', pathname + url.search);
		}
		if (destination)
			return new Response(null, {
				status: 303,
				headers: {
					location: destination.pathname + destination.search,
					'cache-control': 'private, no-store'
				}
			});
	}
	// SSR is personalized even for marketing pages; never share HTML between users.
	// Native endpoints retain their explicit cache policy.

	const publicPage =
		event.request.method === 'GET' &&
		canonicalPath !== '/download' &&
		isIndexablePage(pathname) &&
		(event.request.headers.get('accept') ?? '').includes('text/html') &&
		!event.request.headers.get('purpose')?.includes('prefetch') &&
		!event.request.headers.get('sec-purpose')?.includes('prefetch');
	if (publicPage) {
		void db
			.insert(siteVisits)
			.values({
				id: uuidv7(),
				path: pathname,
				referrer: safeReferrer(event.request.headers.get('referer'))
			})
			.catch(() => {});
	}
	logger.debug(
		{ requestId: crypto.randomUUID().slice(0, 8), path: pathname },
		'Incoming request'
	);

	return apiRoutes(event, () => {
		event.response.headers.set('Cache-Control', 'private, no-store');
		// Resolve route metadata and status before sending the document to non-JS clients.
		if (
			event.request.method === 'GET' &&
			(event.request.headers.get('accept') ?? '').includes('text/html')
		)
			event.renderMode = 'async';
		return paraglideMiddleware(event.request, () => {
			// Paraglide supplies the language through request-scoped AsyncLocalStorage;
			// keep the ORIGINAL URL in Solid's request event. Solid router already
			// knows localized path segments, and SSR + browser must see the same path.
			return next();
		});
	});
};

export default siteMiddleware;
