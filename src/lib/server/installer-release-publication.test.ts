import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

vi.mock('$env/dynamic/private', () => ({ env: { BUNNY_STORAGE_ACCESS_KEY: 'test-key' } }));
vi.mock('$lib/server/cdn/common', () => ({
	installersUploadBase: new URL('https://storage.bunnycdn.test/private/ace-blocker-installer/')
}));

import { verifyLegacyInstallerObject } from './installer-release-publication';

function installer(bytes: Uint8Array) {
	return {
		id: 'linux-1',
		os: 'windows',
		architecture: 'x64',
		version: '1.2.3',
		fileName: 'AceBlocker-1.2.3.msi',
		updateState: 'legacy',
		artifactValidatedAt: new Date(),
		sha256: createHash('sha256').update(bytes).digest('hex'),
		size: bytes.byteLength
	} as unknown as Parameters<typeof verifyLegacyInstallerObject>[0];
}
function header(): Uint8Array {
	const bytes = new Uint8Array(512);
	bytes.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
	bytes[28] = 0xfe;
	bytes[29] = 0xff;
	bytes[30] = 9;
	return bytes;
}
describe('revalidation of stored release bytes before publication', () => {
	const oldFetch = globalThis.fetch;
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn());
	});
	afterEach(() => {
		vi.stubGlobal('fetch', oldFetch);
	});
	it('requires the bytes, length and hash of the stored MSI to match', async () => {
		const bytes = header();
		vi.mocked(fetch).mockResolvedValue(new Response(Uint8Array.from(bytes).buffer));
		await expect(verifyLegacyInstallerObject(installer(bytes))).resolves.toBeUndefined();
		expect(fetch).toHaveBeenCalledWith(
			expect.objectContaining({ hostname: 'storage.bunnycdn.test' }),
			expect.objectContaining({ headers: { AccessKey: 'test-key' } })
		);
	});
	it('rejects storage object substitution and invalid MSI contents', async () => {
		const bytes = header();
		vi.mocked(fetch).mockResolvedValueOnce(new Response(new Uint8Array(512)));
		await expect(verifyLegacyInstallerObject(installer(bytes))).rejects.toThrow(/changed/);
		const garbage = new Uint8Array(512);
		vi.mocked(fetch).mockResolvedValueOnce(new Response(garbage));
		await expect(verifyLegacyInstallerObject(installer(garbage))).rejects.toThrow(/MSI/);
	});
	it('rejects older unverified rows without performing a network request', async () => {
		const row = { ...installer(header()), artifactValidatedAt: null };
		await expect(verifyLegacyInstallerObject(row)).rejects.toThrow(/not passed/);
		expect(fetch).not.toHaveBeenCalled();
	});
});
