/** The distributable, not the ZIP wrapper downloaded from GitHub Actions. */
export const INSTALLER_TARGETS = {
	windows: { extension: '.msi', architecture: 'x64', type: 'Windows Installer (MSI)' },
	linux: { extension: '.tar.gz', architecture: 'x64', type: 'Linux release bundle (tar.gz)' }
} as const;

export function expectedInstallerFile(os: string, version: string): string | null {
	if (os === 'windows') return `AceBlocker-${version}.msi`;
	if (os === 'linux') return `AceBlocker-${version}-linux-x64.tar.gz`;
	return null;
}

export function supportedInstallerTarget(os: string, architecture: string): boolean {
	return (os === 'windows' || os === 'linux') && architecture === 'x64';
}
