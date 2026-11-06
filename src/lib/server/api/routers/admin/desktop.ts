import { Elysia, t } from 'elysia';
import { auth } from '$lib/server/auth';
import { createLogger } from '$lib/server/logger';
import { DesktopReleaseError } from '$lib/server/desktop-update-security';
import { publishDesktopRelease, withdrawDesktopRelease } from '$lib/server/desktop-update-service';

const log = createLogger('api:admin:desktop-updates');

async function act(
	request: Request,
	id: string,
	operation: 'publish' | 'withdraw'
): Promise<Response> {
	// Explicit runtime authorization even if this router is remounted elsewhere.
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || session.user.role !== 'admin')
		return new Response('Unauthorized: Admin access required', { status: 403 });
	try {
		if (operation === 'publish') await publishDesktopRelease(id, session.user.id);
		else await withdrawDesktopRelease(id, session.user.id);
		return Response.json({
			success: true,
			state: operation === 'publish' ? 'published' : 'withdrawn'
		});
	} catch (error) {
		const code =
			error instanceof DesktopReleaseError
				? error.code === 'conflict'
					? 409
					: error.code === 'invalid'
						? 400
						: 503
				: 500;
		log.error(
			{
				id,
				operation,
				adminId: session.user.id,
				reason: error instanceof Error ? error.message : 'unknown'
			},
			'Admin desktop update operation failed'
		);
		return Response.json(
			{
				error: true,
				message:
					error instanceof DesktopReleaseError ? error.message : 'Internal Server Error'
			},
			{ status: code }
		);
	}
}

export const desktopAdminRouter = new Elysia({ prefix: '/installers' })
	.post('/publish-desktop', ({ body, request }) => act(request, body.id, 'publish'), {
		body: t.Object({ id: t.String({ minLength: 1, maxLength: 100 }) }),
		detail: {
			operationId: 'publishSignedDesktopInstaller',
			summary: 'Admin-only verification and publication of a signed desktop release',
			security: [{ APIKeyHeader: [] }]
		}
	})
	.post('/withdraw-desktop', ({ body, request }) => act(request, body.id, 'withdraw'), {
		body: t.Object({ id: t.String({ minLength: 1, maxLength: 100 }) }),
		detail: {
			operationId: 'withdrawSignedDesktopInstaller',
			summary: 'Admin-only permanent desktop update withdrawal (no implicit fallback)',
			security: [{ APIKeyHeader: [] }]
		}
	});
