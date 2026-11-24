import { getInstallerURL } from '$lib/server/cdn';
import { incrementInstallerDownloadCount } from '$lib/server/cache';
import { createLogger } from '$lib/server/logger';
import { isPublicDownloadEnabled } from '$lib/public-download-platforms';

const log = createLogger('routes:download');
type Target = { os: 'windows' | 'linux' | 'macos'; architecture: 'x64' | 'arm64' };
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

export async function GET(event: { params: { arch: string } }) {
	const { arch } = event.params;
	const targets = ARCH_TARGETS[arch];
	if (!Object.hasOwn(ARCH_TARGETS, arch)) {
		log.warn({ arch }, 'Download requested for unsupported architecture');
		return new Response(`Unsupported architecture: ${arch}`, { status: 400 });
	}
	if (targets.every((target) => !isPublicDownloadEnabled(target.os))) {
		log.info({ arch }, 'Download requested for inactive platform');
		return new Response(`No installer available for ${arch}`, { status: 404 });
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
		return Response.redirect(url, 302);
	}
	log.warn({ arch }, 'No downloadable installer for requested architecture');
	return new Response(`No installer available yet for ${arch}`, { status: 404 });
}
