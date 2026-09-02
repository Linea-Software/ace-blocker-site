import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tests for the public installer download flow: the [arch] route is
// DB-driven (redirects to the release-manager CDN URL, never hardcoded
// paths), increments the matching installer's download count, and the page
// load exposes the requested platform's metadata (version, size, sha256).

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		trace: vi.fn(),
		fatal: vi.fn(),
		child: () => ({
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
			trace: vi.fn(),
			fatal: vi.fn()
		})
	})
}));

const { getInstallerURL, getInstallerFor, getLatestInstaller, incrementInstallerDownloadCount } =
	vi.hoisted(() => ({
		getInstallerURL: vi.fn(),
		getInstallerFor: vi.fn(),
		getLatestInstaller: vi.fn(),
		incrementInstallerDownloadCount: vi.fn().mockResolvedValue(undefined)
	}));

vi.mock('$lib/server/cdn', () => ({ getInstallerURL }));
vi.mock('$lib/server/cache', () => ({
	getInstallerFor,
	getLatestInstaller,
	incrementInstallerDownloadCount
}));

import { GET } from './[arch]/+server';
import { load } from './+page.server';

const WINDOWS_URL = new URL(
	'https://cdn.aceblocker.test/dev/ace-blocker-installer/1.0.0/windows/x64/Ace%20Blocker%20Installer.exe'
);

const WINDOWS_ROW = {
	id: 'w1',
	fileName: 'Ace Blocker Installer.exe',
	version: '1.0.0',
	os: 'windows',
	architecture: 'x64',
	downloadUrl: WINDOWS_URL.toString(),
	createdAt: new Date('2026-09-01T00:00:00Z'),
	sha256: 'a'.repeat(64),
	size: 123456,
	canBeDownloaded: true,
	downloadCount: 0
};

function routeEvent(arch: string) {
	return { params: { arch } } as never;
}

describe('download [arch] route', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getInstallerURL.mockReturnValue({
			isOk: () => true,
			isErr: () => false,
			_unsafeUnwrap: () => ({
				url: WINDOWS_URL,
				version: '1.0.0',
				sha256: 'a'.repeat(64),
				size: 123456
			})
		} as never);
	});

	it('redirects to the public CDN URL for a known arch', async () => {
		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 302 });
		// The redirect target is the release-manager URL (token-free, public).
		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({
			location: WINDOWS_URL.href
		});
	});

	it('increments the matching installer download count with os/arch', async () => {
		await expect(GET(routeEvent('windows_x64'))).rejects.toMatchObject({ status: 302 });
		expect(incrementInstallerDownloadCount).toHaveBeenCalledWith('windows', 'x64');
	});

	it('tries both architectures for macos_universal and uses the first hit', async () => {
		getInstallerURL
			.mockReturnValueOnce({
				isErr: () => true,
				error: 2 // NoReleaseAvailable
			} as never)
			.mockReturnValue({
				isOk: () => true,
				isErr: () => false,
				_unsafeUnwrap: () => ({
					url: new URL(
						'https://cdn.aceblocker.test/dev/ace-blocker-installer/1.0.0/macos/arm64/Ace%20Blocker%20Installer.dmg'
					),
					version: '1.0.0',
					sha256: 'b'.repeat(64),
					size: 654321
				})
			} as never);

		await expect(GET(routeEvent('macos_universal'))).rejects.toMatchObject({ status: 302 });
		expect(getInstallerURL).toHaveBeenNthCalledWith(1, 'macos', 'x64');
		expect(getInstallerURL).toHaveBeenNthCalledWith(2, 'macos', 'arm64');
		expect(incrementInstallerDownloadCount).toHaveBeenCalledWith('macos', 'arm64');
	});

	it('404s when no release exists for a known arch', async () => {
		getInstallerURL.mockReturnValue({
			isErr: () => true,
			error: 2 // NoReleaseAvailable
		} as never);

		await expect(GET(routeEvent('linux_x64'))).rejects.toMatchObject({ status: 404 });
		expect(incrementInstallerDownloadCount).not.toHaveBeenCalled();
	});

	it('400s for an unknown arch', async () => {
		await expect(GET(routeEvent('arm_32'))).rejects.toMatchObject({ status: 400 });
		expect(getInstallerURL).not.toHaveBeenCalled();
		expect(incrementInstallerDownloadCount).not.toHaveBeenCalled();
	});
});

describe('download page load', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	type PublicInstaller = {
		version: string;
		size: number;
		os: string;
		architecture: string;
		hash: string;
	};
	type PageData = {
		platforms: {
			windows: PublicInstaller | null;
			macos: PublicInstaller | null;
			linux: PublicInstaller | null;
		};
		requestedArch: string;
	};

	async function loadData(url: string): Promise<PageData> {
		return (await load({ url: new URL(url) } as never)) as PageData;
	}

	function macRow(os: 'windows' | 'macos' | 'linux', architecture = 'x64') {
		return {
			id: `${os}-${architecture}`,
			fileName: `Ace Blocker Installer.${os === 'windows' ? 'exe' : 'dmg'}`,
			version: '1.0.0',
			os,
			architecture,
			downloadUrl: 'https://cdn.aceblocker.test/dev/ace-blocker-installer/1.0.0',
			createdAt: new Date('2026-09-01T00:00:00Z'),
			sha256: `${os[0]}${architecture}`.repeat(32),
			size: 123456,
			canBeDownloaded: true,
			downloadCount: 0
		};
	}

	it('exposes per-platform metadata from the exact (os, arch) targets the [arch] route serves', async () => {
		getInstallerFor.mockImplementation((os: string, architecture: string) => {
			if (os === 'windows' && architecture === 'x64') return macRow('windows');
			if (os === 'macos' && architecture === 'arm64') return macRow('macos', 'arm64');
			return null;
		});

		const data = await loadData('http://localhost/download?arch=windows_x64');

		// Windows resolved from (windows, x64); macOS via its arm64 fallback
		// (macos_universal serves x64 then arm64); Linux has no release.
		expect(data.platforms.windows).toMatchObject({ os: 'windows', architecture: 'x64' });
		expect(data.platforms.macos).toMatchObject({ os: 'macos', architecture: 'arm64' });
		expect(data.platforms.linux).toBeNull();
		expect(data.requestedArch).toBe('windows_x64');
	});

	it('labels every platform without a release as unavailable instead of guessing', async () => {
		getInstallerFor.mockReturnValue(null as never);

		const data = await loadData('http://localhost/download');
		expect(data.platforms).toEqual({ windows: null, macos: null, linux: null });
	});

	it('keeps requested arch echo for the page to pick the download target', async () => {
		getInstallerFor.mockReturnValue(WINDOWS_ROW as never);

		const data = await loadData('http://localhost/download?arch=macos_universal');
		expect(data.platforms.windows).toMatchObject({ version: '1.0.0', hash: 'a'.repeat(64) });
		expect(data.requestedArch).toBe('macos_universal');
	});
});
