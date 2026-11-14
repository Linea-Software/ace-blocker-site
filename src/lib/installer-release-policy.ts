/** The distributable, not the ZIP wrapper downloaded from GitHub Actions. */
export const INSTALLER_TARGETS = {
	windows: { extension: '.msi', architecture: 'x64', type: 'Windows Installer (MSI)' },
	linux: { extension: '.tar.gz', architecture: 'x64', type: 'Linux release bundle (tar.gz)' }
} as const;

/** Both Windows packages are distributable. The MSI remains the signed updater payload. */
export function expectedInstallerFiles(os: string, version: string): string[] {
	if (os === 'windows') return [`AceBlocker-${version}.msi`, `AceBlocker-Setup-${version}.exe`];
	if (os === 'linux') return [`AceBlocker-${version}-linux-x64.tar.gz`];
	return [];
}

export function expectedInstallerFile(os: string, version: string): string | null {
	return expectedInstallerFiles(os, version)[0] ?? null;
}

export function supportedInstallerTarget(os: string, architecture: string): boolean {
	return (os === 'windows' || os === 'linux') && architecture === 'x64';
}
