import { Elysia } from 'elysia';
import { auth } from '$lib/server/auth';
import { usersRouter } from './users';
import { sitePacksRouter } from './site-packs';
import { installersRouter } from './installers';
import { resistanceRouter } from './resistance';

export const adminRouter = new Elysia({ prefix: '/admin' })
	.derive(async ({ request }) => {
		const session = await auth.api.getSession({
			headers: request.headers
		});

		if (!session || session.user.role !== 'admin') {
			return {
				isAdmin: false,
				adminUser: null
			};
		}

		return {
			isAdmin: true,
			adminUser: session.user
		};
	})
	.onBeforeHandle(({ isAdmin, set }) => {
		if (!isAdmin) {
			set.status = 403;
			return 'Unauthorized: Admin access required';
		}
	})
	.use(usersRouter)
	.use(sitePacksRouter)
	.use(installersRouter)
	.use(resistanceRouter);
