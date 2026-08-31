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
		getInstallerFor.mockReturnValue(WINDOWS_ROW as never);
	});

	// The PageServerLoad type may resolve to void; narrow it for assertions.
	async function loadData(url: string): Promise<{
		installer: {
			version: string;
			size: number;
			os: string;
			architecture: string;
			hash: string;
		} | null;
	}> {
		return (await load({ url: new URL(url) } as never)) as {
			installer: {
				version: string;
				size: number;
				os: string;
				architecture: string;
				hash: string;
			} | null;
		};
	}

	it('exposes the requested arch metadata (version, size, sha256) for display', async () => {
		const data = await loadData('http://localhost/download?arch=windows_x64');

		expect(getInstallerFor).toHaveBeenCalledWith('windows', 'x64');
		expect(data.installer).toMatchObject({
			version: '1.0.0',
			size: 123456,
			os: 'windows',
			architecture: 'x64',
			hash: 'a'.repeat(64)
		});
	});

	it('falls back to the latest installer for an unknown arch query', async () => {
		getInstallerFor.mockReturnValue(null as never);
		getLatestInstaller.mockReturnValue(WINDOWS_ROW as never);

		const data = await loadData('http://localhost/download?arch=bogus');
		expect(data.installer).toMatchObject({ version: '1.0.0', hash: 'a'.repeat(64) });
	});
});
