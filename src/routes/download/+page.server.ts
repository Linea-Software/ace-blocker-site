import { getInstallerFor } from '$lib/server/cache';
import type { aceBlockerInstaller } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

// The download page must reflect per-platform reality instead of resolving a
// single global "latest" row. The [arch] route below is the source of truth
// for what each platform tile can actually serve, so availability here
// mirrors those exact (os, architecture) targets.
const PLATFORM_TARGETS: Record<
	'windows' | 'macos' | 'linux',
	{ os: 'windows' | 'linux' | 'macos'; architecture: 'x64' | 'arm64' }[]
> = {
	windows: [
		{ os: 'windows', architecture: 'x64' },
		{ os: 'windows', architecture: 'arm64' }
	],
	macos: [
		{ os: 'macos', architecture: 'x64' },
		{ os: 'macos', architecture: 'arm64' }
	],
	linux: [
		{ os: 'linux', architecture: 'x64' },
		{ os: 'linux', architecture: 'arm64' }
	]
};

type InstallerRow = typeof aceBlockerInstaller.$inferSelect;

function firstAvailableRow(
	targets: {
		os: 'windows' | 'linux' | 'macos';
		architecture: 'x64' | 'arm64';
	}[]
): InstallerRow | null {
	for (const target of targets) {
		const row = getInstallerFor(target.os, target.architecture);
		if (row) return row;
	}
	return null;
}

function toPublic(row: InstallerRow) {
	return {
		version: row.version,
		size: row.size,
		os: row.os,
		architecture: row.architecture,
		createdAt: row.createdAt,
		hash: row.sha256
	};
}

export const load: PageServerLoad = async ({ url }) => {
	const requestedArch = url.searchParams.get('arch') ?? 'windows_x64';

	const platforms = {
		windows: firstAvailableRow(PLATFORM_TARGETS.windows),
		macos: firstAvailableRow(PLATFORM_TARGETS.macos),
		linux: firstAvailableRow(PLATFORM_TARGETS.linux)
	};

	return {
		// Metadata for every platform that has a downloadable installer, so
		// the page can label each tile truthfully (no "Coming soon" for a
		// platform that has a release, and no dead Windows link when nothing
		// exists at all).
		platforms: {
			windows: platforms.windows ? toPublic(platforms.windows) : null,
			macos: platforms.macos ? toPublic(platforms.macos) : null,
			linux: platforms.linux ? toPublic(platforms.linux) : null
		},
		requestedArch
	};
};
