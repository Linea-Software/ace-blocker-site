/**
 * Linux NSS tools needed by devcert / browser certificate trust.
 * Resolve the distro from os-release rather than assuming dpkg/apt exists.
 * Keep this module free from side effects so the installer can be unit-tested.
 */
export type InstallCommand = { command: string; args: string[] };
export type LinuxNssInstallPlan = {
	family: string;
	packageName: string;
	commands: InstallCommand[];
};

export function resolveLinuxNssInstallPlan(osRelease: string): LinuxNssInstallPlan | null {
	const metadata: Record<string, string> = {};
	for (const line of osRelease.split(/\r?\n/)) {
		const match = line.match(/^(ID|ID_LIKE)=(.*)$/);
		if (!match) continue;
		const value = match[2].trim();
		metadata[match[1]] = value.replace(/^(["'])(.*)\1$/, '$2');
	}

	// The exact distro wins over ID_LIKE, which describes its upstream family.
	const names = [metadata.ID ?? '', ...(metadata.ID_LIKE ?? '').split(/\s+/)]
		.map((name) => name.toLowerCase())
		.filter(Boolean);

	for (const name of names) {
		if (['arch', 'archlinux', 'manjaro', 'endeavouros', 'cachyos', 'artix'].includes(name)) {
			return {
				family: 'Arch Linux',
				packageName: 'nss',
				// Avoid pacman -Sy (partial upgrade) or silently upgrading the whole workstation.
				commands: [{ command: 'pacman', args: ['-S', '--needed', '--noconfirm', 'nss'] }]
			};
		}
		if (['debian', 'ubuntu', 'linuxmint', 'pop', 'elementary', 'kali'].includes(name)) {
			return {
				family: 'Debian/Ubuntu',
				packageName: 'libnss3-tools',
				commands: [
					{ command: 'apt', args: ['update'] },
					{ command: 'apt', args: ['install', '-y', 'libnss3-tools'] }
				]
			};
		}
		if (['fedora', 'rhel', 'centos', 'rocky', 'almalinux', 'ol'].includes(name)) {
			return {
				family: 'Fedora/RHEL',
				packageName: 'nss-tools',
				commands: [{ command: 'dnf', args: ['install', '-y', 'nss-tools'] }]
			};
		}
		if (['opensuse', 'opensuse-tumbleweed', 'opensuse-leap', 'suse', 'sles'].includes(name)) {
			return {
				family: 'openSUSE',
				packageName: 'mozilla-nss-tools',
				commands: [
					{
						command: 'zypper',
						args: ['--non-interactive', 'install', 'mozilla-nss-tools']
					}
				]
			};
		}
		if (name === 'alpine') {
			return {
				family: 'Alpine Linux',
				packageName: 'nss-tools',
				commands: [{ command: 'apk', args: ['--update-cache', 'add', 'nss-tools'] }]
			};
		}
	}
	return null;
}
