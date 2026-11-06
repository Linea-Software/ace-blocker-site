import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

vi.mock('$lib/server/cdn/common', () => ({
	installersBasePath: new URL('https://cdn.example.test/ace-blocker-installer/'),
	installersUploadBase: new URL('https://storage.bunnycdn.com/public-zone/ace-blocker-installer/')
}));
import { promoteDesktopObject, verifyStoredObject } from './desktop-update-storage';

const contents = Buffer.from('d0cf11e0a1b11ae10102030405060708', 'hex');
const digest = createHash('sha256').update(contents).digest('hex');
const version = '1.10.0';
const previous = {
	ACE_DESKTOP_STAGING_ZONE: process.env.ACE_DESKTOP_STAGING_ZONE,
	ACE_DESKTOP_STAGING_ACCESS_KEY: process.env.ACE_DESKTOP_STAGING_ACCESS_KEY,
	BUNNY_STORAGE_ACCESS_KEY: process.env.BUNNY_STORAGE_ACCESS_KEY,
	BUNNY_STORAGE_ZONE: process.env.BUNNY_STORAGE_ZONE,
	BUNNY_CDN_BASE_URL: process.env.BUNNY_CDN_BASE_URL
};

describe('Bunny desktop release object verification and promotion', () => {
	beforeEach(() => {
		process.env.ACE_DESKTOP_STAGING_ZONE = 'private-zone';
		process.env.ACE_DESKTOP_STAGING_ACCESS_KEY = 'test-stage-key';
		process.env.BUNNY_STORAGE_ZONE = 'public-zone';
		process.env.BUNNY_STORAGE_ACCESS_KEY = 'test-public-key';
		process.env.BUNNY_CDN_BASE_URL = 'cdn.example.test';
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		for (const [name, value] of Object.entries(previous)) {
			if (value === undefined) delete process.env[name];
			else process.env[name] = value;
		}
	});

	it('streams and hashes private storage without a large ArrayBuffer or CDN token', async () => {
		const get = vi.fn(async (url: URL, init: RequestInit) => {
			expect(url.origin).toBe('https://storage.bunnycdn.com');
			expect(url.pathname).toContain('/private-zone/desktop-updates/1.10.0/');
			expect(init.headers).toEqual({ AccessKey: 'test-stage-key' });
			return new Response(contents);
		});
		vi.stubGlobal('fetch', get);
		await verifyStoredObject('staging', version, digest, contents.length);
		expect(get).toHaveBeenCalledTimes(1);
	});

	it('rejects truncated, tampered, non-MSI, unavailable and wrong-credential staging', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(Buffer.alloc(contents.length)))
		);
		await expect(
			verifyStoredObject('staging', version, digest, contents.length)
		).rejects.toThrow(/not an MSI/);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(contents))
		);
		await expect(
			verifyStoredObject('staging', version, digest, contents.length + 1)
		).rejects.toThrow(/integrity/);
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => new Response(null, { status: 503 }))
		);
		await expect(
			verifyStoredObject('staging', version, digest, contents.length)
		).rejects.toThrow(/storage returned an error/i);
		process.env.ACE_DESKTOP_STAGING_ZONE = 'public-zone';
		await expect(
			verifyStoredObject('staging', version, digest, contents.length)
		).rejects.toThrow(/separate private/);
	});

	it('copies private staging only once during approval and revalidates public bytes', async () => {
		const calls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: URL, init: RequestInit) => {
				calls.push(init.method ?? 'GET');
				const pathname = url.pathname;
				if (init.method === 'HEAD') {
					if (url.hostname === 'storage.bunnycdn.com')
						return new Response(null, { status: 404 });
					expect(init.headers).toBeUndefined(); // Anonymous pull zone, no token.
					return new Response(null, {
						status: 200,
						headers: { 'content-length': String(contents.length) }
					});
				}
				if (init.method === 'PUT') {
					expect(pathname).toContain('/signed/windows/x64/1.10.0/');
					expect(init.headers).toMatchObject({
						AccessKey: 'test-public-key',
						Checksum: digest
					});
					expect(init.body).toBeTruthy();
					return new Response(null, { status: 201 });
				}
				if (pathname.includes('/private-zone/')) return new Response(contents);
				if (pathname.includes('/public-zone/')) return new Response(contents);
				throw new Error('Unknown URL');
			})
		);
		await promoteDesktopObject(version, digest, contents.length);
		expect(calls).toEqual(['HEAD', 'GET', 'GET', 'PUT', 'GET', 'HEAD']);
	});
	it('rejects a CDN pull zone that requires authentication', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: URL, init: RequestInit) => {
				if (init.method === 'HEAD' && url.hostname === 'storage.bunnycdn.com')
					return new Response(null, { status: 404 });
				if (init.method === 'HEAD') return new Response(null, { status: 403 });
				if (init.method === 'PUT') return new Response(null, { status: 201 });
				return new Response(contents);
			})
		);
		await expect(promoteDesktopObject(version, digest, contents.length)).rejects.toThrow(
			/requires authentication/
		);
	});
	it('never overwrites an existing public object', async () => {
		const fetchMock = vi.fn(async () => new Response(null, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);
		await expect(promoteDesktopObject(version, digest, contents.length)).rejects.toThrow(
			/Destination already exists/
		);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
