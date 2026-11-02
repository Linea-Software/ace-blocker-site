import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInstallerURL } from '$lib/server/cdn';
import { incrementInstallerDownloadCount } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';

const log = createLogger('routes:download');

type Target = { os: 'windows' | 'linux' | 'macos'; architecture: 'x64' | 'arm64' };

// Route arch ids → installer lookup targets, tried in order. macOS "universal"
// accepts either architecture row (prefer x64). Unknown arch ids 400 cleanly
// and a known arch with no release row 404s — both DB-driven, never hardcoded
// CDN paths.
const ARCH_TARGETS: Record<string, Target[]> = {
	windows_x64: [{ os: 'windows', architecture: 'x64' }],
	windows_arm64: [{ os: 'windows', architecture: 'arm64' }],
	linux_x64: [{ os: 'linux', architecture: 'x64' }],
	linux_arm64: [{ os: 'linux', architecture: 'arm64' }],
	macos_universal: [
		{ os: 'macos', architecture: 'x64' },
		{ os: 'macos', architecture: 'arm64' }
	]
};

export const GET: RequestHandler = async ({ params }) => {
	const { arch } = params;
	const targets = ARCH_TARGETS[arch];

	if (!targets) {
		log.warn({ arch }, 'Download requested for unsupported architecture');
		throw error(400, `Unsupported architecture: ${arch}`);
	}

	for (const target of targets) {
		const result = getInstallerURL(target.os, target.architecture);
		if (result.isErr()) continue;

		const { url, version } = result._unsafeUnwrap();
		await incrementInstallerDownloadCount(target.os, target.architecture);
		log.info(
			{
				arch,
				os: target.os,
				architecture: target.architecture,
				version,
				url: url.toString()
			},
			'Redirecting installer download to CDN'
		);
		throw redirect(302, url);
	}

	log.warn({ arch }, 'No downloadable installer for requested architecture');
	throw error(404, `No installer available yet for ${arch}`);
};
