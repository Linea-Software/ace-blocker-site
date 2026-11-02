import { describe, expect, it } from 'vitest';
import { resolveLinuxNssInstallPlan } from '../../../../scripts/linux-setup';

describe('portable local Linux setup', () => {
	it.each([
		['Ubuntu', 'ID=ubuntu\nID_LIKE=debian', 'Debian/Ubuntu', 'libnss3-tools', 'apt'],
		['Debian', 'ID=debian', 'Debian/Ubuntu', 'libnss3-tools', 'apt'],
		[
			'Linux Mint',
			'ID=linuxmint\nID_LIKE="ubuntu debian"',
			'Debian/Ubuntu',
			'libnss3-tools',
			'apt'
		],
		['Arch', 'NAME="Arch Linux"\nID=arch', 'Arch Linux', 'nss', 'pacman'],
		['Manjaro', 'ID=manjaro\nID_LIKE=arch', 'Arch Linux', 'nss', 'pacman'],
		['EndeavourOS', 'ID=endeavouros\nID_LIKE=arch', 'Arch Linux', 'nss', 'pacman'],
		['CachyOS', 'ID=cachyos\nID_LIKE=arch', 'Arch Linux', 'nss', 'pacman'],
		['Fedora', 'ID=fedora', 'Fedora/RHEL', 'nss-tools', 'dnf'],
		[
			'Rocky Linux',
			'ID=rocky\nID_LIKE="rhel centos fedora"',
			'Fedora/RHEL',
			'nss-tools',
			'dnf'
		],
		[
			'openSUSE Tumbleweed',
			'ID=opensuse-tumbleweed\nID_LIKE="suse opensuse"',
			'openSUSE',
			'mozilla-nss-tools',
			'zypper'
		],
		['Alpine Linux', 'ID=alpine', 'Alpine Linux', 'nss-tools', 'apk']
	])(
		'selects NSS package and manager for %s',
		(_distro, osRelease, family, packageName, packageManager) => {
			const plan = resolveLinuxNssInstallPlan(osRelease);

			expect(plan).not.toBeNull();
			expect(plan).toMatchObject({ family, packageName });
			expect(plan!.commands.at(-1)!.command).toBe(packageManager);
		}
	);

	it('preserves the apt setup commands and avoids unattended system upgrades on Arch', () => {
		expect(resolveLinuxNssInstallPlan('ID=ubuntu')?.commands).toEqual([
			{ command: 'apt', args: ['update'] },
			{ command: 'apt', args: ['install', '-y', 'libnss3-tools'] }
		]);
		expect(resolveLinuxNssInstallPlan('ID=arch')?.commands).toEqual([
			{ command: 'pacman', args: ['-S', '--needed', '--noconfirm', 'nss'] }
		]);
	});

	it('rejects unsupported distributions without guessing a package manager', () => {
		expect(resolveLinuxNssInstallPlan('ID=nixos')).toBeNull();
		expect(resolveLinuxNssInstallPlan('')).toBeNull();
	});

	it('prioritizes the exact distro before its ID_LIKE family', () => {
		expect(resolveLinuxNssInstallPlan('ID=alpine\nID_LIKE="arch"')?.family).toBe(
			'Alpine Linux'
		);
	});
});
