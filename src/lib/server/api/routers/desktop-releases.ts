import { Elysia, t } from 'elysia';
import { timingSafeEqual } from 'node:crypto';
import { getLatestDesktopEnvelope } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';
import {
	DesktopReleaseError,
	envelopeEtag,
	updatesEnabled
} from '$lib/server/desktop-update-security';
import { stageDesktopRelease } from '$lib/server/desktop-update-service';

const log = createLogger('api:desktop-releases');
let activeIngest = 0;
let windowStart = 0;
let windowCount = 0;

function isAuthenticated(request: Request): boolean {
	const expected = process.env.ACE_RELEASE_INGEST_TOKEN;
	const bearer = request.headers.get('authorization');
	if (!expected || !bearer?.startsWith('Bearer ')) return false;
	const a = Buffer.from(expected);
	const b = Buffer.from(bearer.slice(7));
	return a.length === b.length && timingSafeEqual(a, b);
}

function responseForError(error: unknown) {
	if (error instanceof DesktopReleaseError) {
		const code =
			error.code === 'disabled' || error.code === 'unavailable'
				? 503
				: error.code === 'conflict'
					? 409
					: 400;
		return new Response(JSON.stringify({ error: true, message: error.message }), {
			status: code,
			headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
		});
	}
	log.error({ err: error instanceof Error ? error.message : 'unknown' }, 'Desktop ingest failed');
	return new Response(JSON.stringify({ error: true, message: 'Internal Server Error' }), {
		status: 500,
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
	});
}

export const desktopReleasesRouter = new Elysia({ prefix: '/releases' })
	// onRequest runs before Elysia parses the JSON body. Never let an unauthenticated
	// caller force a large in-memory parse of a signed-release ingest request.
	.onRequest(({ request }) => {
		if (
			request.method !== 'POST' ||
			!new URL(request.url).pathname.endsWith('/releases/ingest/desktop')
		)
			return;
		if (!process.env.ACE_RELEASE_INGEST_TOKEN) return new Response(null, { status: 503 });
		if (!isAuthenticated(request)) return new Response(null, { status: 401 });
		if (!updatesEnabled()) return new Response(null, { status: 503 });
		const length = request.headers.get('content-length');
		if (!length || !/^[1-9][0-9]*$/.test(length)) return new Response(null, { status: 411 });
		if (Number(length) > 16 * 1024) return new Response(null, { status: 413 });
		if (
			request.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() !==
			'application/json'
		)
			return new Response(null, { status: 415 });
	})
	.get(
		'/desktop/latest',
		({ query, request }) => {
			// No auth, login, account, license, subscription or signed download URL.
			const { os = 'windows', architecture = 'x64', channel = 'stable' } = query;
			if (os !== 'windows' || architecture !== 'x64' || channel !== 'stable')
				return new Response(
					JSON.stringify({ error: true, message: 'Unsupported desktop target' }),
					{
						status: 400,
						headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
					}
				);
			if (
				!updatesEnabled() ||
				!process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS ||
				!process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256
			)
				return new Response(null, {
					status: 503,
					headers: { 'cache-control': 'no-store' }
				});
			const envelope = getLatestDesktopEnvelope();
			if (!envelope)
				return new Response(null, {
					status: 204,
					headers: { 'cache-control': 'no-store' }
				});
			const etag = envelopeEtag(envelope);
			const headers = {
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'public, no-cache, must-revalidate',
				etag
			};
			if (
				request.headers
					.get('if-none-match')
					?.split(',')
					.map((x) => x.trim())
					.includes(etag)
			)
				return new Response(null, { status: 304, headers });
			return new Response(JSON.stringify(envelope), { status: 200, headers });
		},
		{
			query: t.Object({
				os: t.Optional(t.String()),
				architecture: t.Optional(t.String()),
				channel: t.Optional(t.String())
			}),
			detail: {
				operationId: 'getLatestSignedDesktopRelease',
				summary: 'Public, account-independent Ed25519 authenticated desktop update feed',
				security: []
			}
		}
	)
	.post(
		'/ingest/desktop',
		async ({ body, request }) => {
			if (!process.env.ACE_RELEASE_INGEST_TOKEN) return new Response(null, { status: 503 });
			if (!isAuthenticated(request))
				return new Response(JSON.stringify({ error: true, message: 'Unauthorized' }), {
					status: 401,
					headers: { 'content-type': 'application/json' }
				});
			if (!updatesEnabled()) return new Response(null, { status: 503 });
			const contentLength = Number(request.headers.get('content-length') || 0);
			if (contentLength > 16384) return new Response(null, { status: 413 });

			const now = Date.now();
			if (now - windowStart >= 60000) {
				windowStart = now;
				windowCount = 0;
			}
			if (++windowCount > 6 || activeIngest >= 2)
				return new Response(null, { status: 429, headers: { 'retry-after': '60' } });
			activeIngest++;
			try {
				const id = await stageDesktopRelease(body);
				return new Response(JSON.stringify({ success: true, id, state: 'staged' }), {
					status: 201,
					headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
				});
			} catch (error) {
				return responseForError(error);
			} finally {
				activeIngest--;
			}
		},
		{
			body: t.Object({
				envelope: t.Object({
					payload: t.String({ maxLength: 16384 }),
					signature: t.String({ maxLength: 128 }),
					key_id: t.String({ maxLength: 80 })
				}),
				stagingKey: t.String({ maxLength: 200 }),
				size: t.Number({ minimum: 1, maximum: 2147483647 }),
				sourceRepository: t.Optional(t.String({ maxLength: 200 })),
				sourceCommit: t.Optional(t.String({ maxLength: 64 })),
				sourceRunId: t.Optional(t.String({ maxLength: 64 })),
				sourceRunUrl: t.Optional(t.String({ maxLength: 500 })),
				engineCommit: t.Optional(t.String({ maxLength: 64 })),
				appCommit: t.Optional(t.String({ maxLength: 64 }))
			}),
			detail: {
				operationId: 'ingestSignedDesktopRelease',
				summary: 'Verify and stage a privately hosted signed MSI (never publish on ingest)',
				security: []
			}
		}
	);
