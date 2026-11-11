/**
 * Explains why an admin action cannot be performed before a click.
 * The API independently enforces the same security boundaries.
 */
export type InstallerRecord = {
	os: string;
	version: string;
	architecture: string;
	updateState: string;
	artifactValidatedAt: string | Date | null;
	canBeDownloaded: boolean;
};

export type InstallerActionBlock =
	| 'unverified'
	| 'withdrawn'
	| 'linked_linux'
	| 'manual_windows'
	| 'manual_linux'
	| 'missing_linux'
	| 'unavailable';

export function installerActionBlock(
	release: InstallerRecord,
	installers: InstallerRecord[],
	allowUnsignedDevelopment: boolean
): InstallerActionBlock | null {
	// A signed Windows release atomically owns both platforms' visibility.
	if (
		release.os === 'linux' &&
		installers.some(
			(other) =>
				other.os === 'windows' &&
				other.version === release.version &&
				other.architecture === 'x64' &&
				other.updateState === 'published'
		)
	)
		return 'linked_linux';

	if (release.updateState === 'withdrawn') return 'withdrawn';

	// Withdrawal remains possible for previously published legacy builds.
	if (release.canBeDownloaded)
		return release.updateState === 'published' || release.updateState === 'legacy'
			? null
			: 'unavailable';

	if (!release.artifactValidatedAt) return 'unverified';

	if (release.updateState === 'staged' && release.os === 'windows') {
		const companions = installers.filter(
			(other) =>
				other.os === 'linux' &&
				other.architecture === 'x64' &&
				other.version === release.version &&
				other.updateState === 'legacy' &&
				!!other.artifactValidatedAt
		);
		return companions.length === 1 ? null : 'missing_linux';
	}

	if (release.updateState === 'legacy') {
		if (allowUnsignedDevelopment) return null;
		return release.os === 'windows' ? 'manual_windows' : 'manual_linux';
	}

	return 'unavailable';
}
