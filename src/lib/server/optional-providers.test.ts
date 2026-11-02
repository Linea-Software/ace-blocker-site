import { describe, expect, it, vi } from 'vitest';

// Simulate an environment with none of the optional provider credentials.
vi.mock('$env/dynamic/private', () => ({ env: {} }));
const { sendTransport, fetchTransport } = vi.hoisted(() => ({
	sendTransport: vi.fn(),
	fetchTransport: vi.fn()
}));
vi.mock('resend', () => ({ Resend: sendTransport }));
vi.mock('$lib/server/db', () => ({ db: {} }));
vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}));
vi.mock('$lib/server/cache', () => ({
	getLatestSitePacks: vi.fn(() => new Map()),
	getLatestResistanceScript: vi.fn(() => null),
	getInstallerFor: vi.fn(() => null)
}));
vi.stubGlobal('fetch', fetchTransport);

import { resend } from './email';
import { CDNErrorType, generateBunnyCDNToken, isBunnyCdnConfigured } from './cdn/common';
import { getInstallerURL, getResistanceModeScriptsURL } from './cdn/get';
import { deleteFileFromBunnyCDN } from './cdn/delete';
import { uploadResistanceModeScript } from './cdn/upload';

describe('development without optional API credentials', () => {
	it('imports the email service without creating a real Resend client or sending emails', async () => {
		const result = await resend.emails.send({
			from: 'noreply@aceblocker.com',
			to: 'test@example.com',
			subject: 'Test',
			html: '<p>Test</p>'
		});
		expect(result.data).toBeNull();
		expect(result.error?.name).toBe('missing_api_key');
		expect(sendTransport).not.toHaveBeenCalled();
		expect(fetchTransport).not.toHaveBeenCalled();
	});

	it('does not generate fake CDN download links or signing tokens', () => {
		expect(isBunnyCdnConfigured()).toBe(false);
		expect(getInstallerURL('windows', 'x64')._unsafeUnwrapErr()).toBe(
			CDNErrorType.ServiceUnavailable
		);
		expect(getResistanceModeScriptsURL()._unsafeUnwrapErr()).toBe(
			CDNErrorType.ServiceUnavailable
		);
		expect(() => generateBunnyCDNToken('/dev/example.zip', 123456)).toThrow(/not configured/);
	});

	it('does not contact Bunny storage for uploads or deletes', async () => {
		const file = new File([new Uint8Array([80, 75, 3, 4, 0])], 'resistance.zip', {
			type: 'application/zip'
		});
		expect((await uploadResistanceModeScript(file, '1.0'))._unsafeUnwrapErr()).toBe(
			CDNErrorType.ServiceUnavailable
		);
		expect(
			(
				await deleteFileFromBunnyCDN(new URL('https://storage.bunnycdn.com/example.zip'))
			)._unsafeUnwrapErr()
		).toBe(CDNErrorType.ServiceUnavailable);
		expect(fetchTransport).not.toHaveBeenCalled();
	});
});
