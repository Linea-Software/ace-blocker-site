import { query } from '@solidjs/router';
import { assertAdminSession } from '../../auth';
import { db } from '$lib/server/db';
import { aceBlockerInstaller } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { canPublishUnsignedInstallers } from '$lib/server/installer-publication-mode';

export const getInstallersData = query(async () => {
	'use server';
	await assertAdminSession();
	const installers = await db
		.select()
		.from(aceBlockerInstaller)
		.orderBy(desc(aceBlockerInstaller.createdAt));
	const totalDownloads = installers.reduce((sum, installer) => sum + installer.downloadCount, 0);

	return {
		installers,
		allowUnsignedPublishing: canPublishUnsignedInstallers(),
		totalDownloads
	};
}, 'admin-installers');
