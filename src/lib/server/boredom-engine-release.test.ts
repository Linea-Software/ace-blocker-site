import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findRelease, uploadResistanceModeScript, isValidArtifactFile } = vi.hoisted(() => ({
	findRelease: vi.fn(),
	uploadResistanceModeScript: vi.fn(),
	isValidArtifactFile: vi.fn()
}));

vi.mock('$lib/server/db', () => ({
	db: { query: { resistanceModeScripts: { findFirst: findRelease } } }
}));

vi.mock('$lib/server/cdn', () => ({
	MAX_ARTIFACT_SIZE: 100 * 1024 * 1024,
	uploadResistanceModeScript,
	isValidArtifactFile
}));

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })
}));

import { getBoredomEngineImportStatus, importBoredomEngineRelease } from './boredom-engine-release';

const TAG = 'v1.2.3';
const VERSION = '1.2.3';
const ASSET_BASE = `https://github.com/Linea-Software/boredom-engine/releases/download/${TAG}/`;
const RELEASE_API = 'https://api.github.com/repos/Linea-Software/boredom-engine/releases/latest';
const zipBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4]);
const SHA256 = createHash('sha256').update(zipBytes).digest('hex');
const checksumText = `${SHA256}  resistance-scripts.zip\n`;

function githubRelease(overrides: Record<string, unknown> = {}) {
	return {
		tag_name: TAG,
		draft: false,
		prerelease: false,
		assets: [
			{
				name: 'resistance-scripts.zip',
				size: zipBytes.byteLength,
				browser_download_url: `${ASSET_BASE}resistance-scripts.zip`,
				digest: `sha256:${SHA256}`
			},
			{
				name: 'sha256_checksums.txt',
				size: new TextEncoder().encode(checksumText).byteLength,
				browser_download_url: `${ASSET_BASE}sha256_checksums.txt`
			}
		],
		...overrides
	};
}

function mockFetch(release = githubRelease(), archive = zipBytes) {
	const fetched = vi.fn(async (url: string) => {
		if (url === RELEASE_API) {
			return new Response(JSON.stringify(release), {
				headers: { 'Content-Type': 'application/json' }
			});
		}
		if (url === `${ASSET_BASE}sha256_checksums.txt`) {
			return new Response(checksumText);
		}
		if (url === `${ASSET_BASE}resistance-scripts.zip`) {
			return new Response(new Uint8Array(archive));
		}
		throw new Error(`Unexpected URL: ${url}`);
	});
	vi.stubGlobal('fetch', fetched);
	return fetched;
}

describe('Boredom Engine GitHub release import', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		findRelease.mockResolvedValue(null);
		isValidArtifactFile.mockResolvedValue(true);
		uploadResistanceModeScript.mockReturnValue(
			Promise.resolve({
				isErr: () => false,
				_unsafeUnwrap: () => ({ hash: SHA256 })
			})
		);
	});

	it('verifies the GitHub asset and stages the release without publishing', async () => {
		const fetched = mockFetch();
		const result = await importBoredomEngineRelease();
		expect(result).toEqual({ release: TAG, version: VERSION, sha256: SHA256, imported: true });
		expect(uploadResistanceModeScript).toHaveBeenCalledOnce();
		expect(uploadResistanceModeScript).toHaveBeenCalledWith(expect.any(File), VERSION, false);
		expect(fetched).toHaveBeenCalledWith(
			`${ASSET_BASE}resistance-scripts.zip`,
			expect.objectContaining({ signal: expect.any(AbortSignal) })
		);
		expect(getBoredomEngineImportStatus()).toMatchObject({
			running: false,
			lastError: null,
			lastResult: { imported: true, version: VERSION }
		});
	});

	it('skips an already imported identical version', async () => {
		const fetched = mockFetch();
		findRelease.mockResolvedValue({ version: VERSION, sha256: SHA256 });
		const result = await importBoredomEngineRelease();
		expect(result.imported).toBe(false);
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
		expect(
			fetched.mock.calls.some(([url]) => url === `${ASSET_BASE}resistance-scripts.zip`)
		).toBe(false);
	});

	it('refuses a reused version with different content', async () => {
		mockFetch();
		findRelease.mockResolvedValue({ version: VERSION, sha256: 'b'.repeat(64) });
		await expect(importBoredomEngineRelease()).rejects.toThrow('different SHA-256');
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('rejects a mismatched archive checksum before writing to the CDN', async () => {
		const bad = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 9, 9, 9, 9]);
		mockFetch(githubRelease(), bad);
		await expect(importBoredomEngineRelease()).rejects.toThrow('SHA-256 mismatch');
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('rejects a release asset pointing to a different host', async () => {
		const release = githubRelease();
		release.assets[0].browser_download_url = 'https://attacker.invalid/resistance-scripts.zip';
		const fetched = mockFetch(release);
		await expect(importBoredomEngineRelease()).rejects.toThrow('Unexpected GitHub asset URL');
		expect(fetched.mock.calls.some(([url]) => String(url).includes('attacker.invalid'))).toBe(
			false
		);
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});

	it('rejects an oversized archive without downloading it', async () => {
		const release = githubRelease();
		release.assets[0].size = 100 * 1024 * 1024 + 1;
		const fetched = mockFetch(release);
		await expect(importBoredomEngineRelease()).rejects.toThrow('100 MiB');
		expect(
			fetched.mock.calls.some(([url]) => url === `${ASSET_BASE}resistance-scripts.zip`)
		).toBe(false);
	});

	it('rejects a checksum file that disagrees with the GitHub digest', async () => {
		const fetched = vi.fn(async (url: string) => {
			if (url === RELEASE_API) return new Response(JSON.stringify(githubRelease()));
			if (url === `${ASSET_BASE}sha256_checksums.txt`) {
				return new Response(`${'b'.repeat(64)}  resistance-scripts.zip\n`);
			}
			throw new Error(`Unexpected URL ${url}`);
		});
		vi.stubGlobal('fetch', fetched);
		await expect(importBoredomEngineRelease()).rejects.toThrow('digest differs');
		expect(uploadResistanceModeScript).not.toHaveBeenCalled();
	});
});
