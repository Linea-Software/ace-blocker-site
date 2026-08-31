import { describe, it, expect, vi, beforeEach } from 'vitest';

// Unit tests for the resistance-mode signed-URL service: token signing,
// metadata passthrough, and the unavailable-release behavior.

vi.mock('$env/dynamic/private', () => ({
	env: {
		BUNNY_URL_TOKEN_AUTH_KEY: 'test-url-token-key',
		BUNNY_STORAGE_ZONE: 'test-zone',
		BUNNY_CDN_BASE_URL: 'cdn.aceblocker.test',
		BUNNY_STORAGE_ACCESS_KEY: 'test-access-key'
	}
}));

const latestResistance = vi.hoisted(() => vi.fn());
const installerFor = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/cache', () => ({
	getLatestResistanceScript: latestResistance,
	getInstallerFor: installerFor,
	getLatestInstaller: vi.fn(),
	getLatestTrackingScript: vi.fn(),
	getLatestSitePacks: vi.fn()
}));

import { getResistanceModeScriptsURL, getInstallerURL } from './get';
import { CDNErrorType } from './common';

describe('getResistanceModeScriptsURL', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns a signed URL with version and sha256 for the current release', () => {
		latestResistance.mockReturnValue({
			id: 'r1',
			version: '2026-09-01',
			fileName: 'resistance-mode-scripts.zip',
			sha256: 'abc123',
			canBeDownloaded: true
		});

		const result = getResistanceModeScriptsURL();
		expect(result.isOk()).toBe(true);
		const { url, version, sha256 } = result._unsafeUnwrap();

		expect(version).toBe('2026-09-01');
		expect(sha256).toBe('abc123');
		expect(url.pathname).toBe('/dev/resistance-mode-scripts/2026-09-01/resistance-mode-scripts.zip');
		expect(url.searchParams.get('token')).toMatch(/^[A-Za-z0-9_-]+$/);
		const expires = Number(url.searchParams.get('expires'));
		expect(expires).toBeGreaterThan(Math.round(Date.now() / 1000));
		expect(expires).toBeLessThanOrEqual(Math.round(Date.now() / 1000) + 600);
	});

	it('returns NoReleaseAvailable when no release is published', () => {
		latestResistance.mockReturnValue(null as never);
		const result = getResistanceModeScriptsURL();
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.NoReleaseAvailable);
		} else {
			expect.unreachable('expected NoReleaseAvailable');
		}
	});
});

describe('getInstallerURL', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('looks up the requested os/arch target, not the globally latest installer', () => {
		installerFor.mockReturnValue({
			id: 'w1',
			version: '1.0.0',
			fileName: 'Ace Blocker Installer.exe',
			os: 'windows',
			architecture: 'x64',
			sha256: 'abc123',
			size: 123456,
			canBeDownloaded: true
		});

		const result = getInstallerURL('windows', 'x64');
		expect(installerFor).toHaveBeenCalledWith('windows', 'x64');
		expect(result.isOk()).toBe(true);

		const { url, version, sha256, size } = result._unsafeUnwrap();
		expect(version).toBe('1.0.0');
		expect(sha256).toBe('abc123');
		expect(size).toBe(123456);
		expect(url.pathname).toBe(
			'/dev/ace-blocker-installer/1.0.0/windows/x64/Ace%20Blocker%20Installer.exe'
		);
		// Installers are public — no token query params.
		expect(url.search).toBe('');
	});

	it('does not fall through to another platform row when the target is missing', () => {
		installerFor.mockReturnValue(null as never);
		const result = getInstallerURL('linux', 'x64');
		if (result.isErr()) {
			expect(result.error).toBe(CDNErrorType.NoReleaseAvailable);
		} else {
			expect.unreachable('expected NoReleaseAvailable');
		}
	});
});
