import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildEngineLinkUrl, linkEngine } from './utils';

describe('desktop license handoff', () => {
	afterEach(() => vi.unstubAllGlobals());

	it('uses an allowlisted protocol link with the key in the fragment', () => {
		expect(buildEngineLinkUrl('test-value')).toBe(
			'aceblocker://account/api-key#apiKey=test-value'
		);
	});

	it('reports pending, NEVER success, after dispatching the OS protocol', async () => {
		const location = { href: 'http://localhost:5173/get-pro' };
		vi.stubGlobal('window', { location });

		expect(await linkEngine(async () => 'synthetic-test-value')).toEqual({ status: 'pending' });
		expect(location.href).toBe('aceblocker://account/api-key#apiKey=synthetic-test-value');
	});

	it('reports an error without dispatch if key creation fails', async () => {
		const location = { href: 'http://localhost:5173/get-pro' };
		vi.stubGlobal('window', { location });

		expect(
			await linkEngine(async () => {
				throw new Error('test key unavailable');
			})
		).toMatchObject({
			status: 'error',
			error: 'Error: test key unavailable'
		});
		expect(location.href).toBe('http://localhost:5173/get-pro');
	});
});
