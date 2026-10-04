import { describe, expect, it, vi } from 'vitest';
import {
	assertCompatibleBetterAuthProvisioningVersion,
	normalizeProvisioningAuthError,
	parseProvisionAdminArgs,
	readNewAdminPassword,
	validateAdminPassword
} from '../../../scripts/provision-admin-input';

describe('provision admin input', () => {
	it('parses and normalizes administrator arguments', () => {
		expect(
			parseProvisionAdminArgs([
				'--email',
				'Admin@AceBlocker.com',
				'--username',
				'  admin  ',
				'--password-stdin'
			])
		).toEqual({
			email: 'admin@aceblocker.com',
			username: 'admin',
			passwordStdin: true
		});
	});

	it('uses a secure terminal prompt when stdin is a TTY, even with --password-stdin', async () => {
		const readPipedPassword = vi.fn(() => 'should-not-be-read');
		const promptPassword = vi.fn().mockResolvedValue('a-secure-admin-password');

		await expect(
			readNewAdminPassword(true, {
				stdinIsTTY: true,
				outputIsTTY: true,
				readPipedPassword,
				promptPassword
			})
		).resolves.toBe('a-secure-admin-password');

		expect(promptPassword).toHaveBeenCalledOnce();
		expect(readPipedPassword).not.toHaveBeenCalled();
	});

	it('reads piped input for non-interactive --password-stdin usage', async () => {
		const readPipedPassword = vi.fn(() => 'piped-admin-password');
		const promptPassword = vi.fn();

		await expect(
			readNewAdminPassword(true, {
				stdinIsTTY: false,
				outputIsTTY: false,
				readPipedPassword,
				promptPassword
			})
		).resolves.toBe('piped-admin-password');

		expect(readPipedPassword).toHaveBeenCalledOnce();
		expect(promptPassword).not.toHaveBeenCalled();
	});

	it('prompts for a new administrator when run interactively without a password flag', async () => {
		await expect(
			readNewAdminPassword(false, {
				stdinIsTTY: true,
				outputIsTTY: true,
				promptPassword: async () => 'interactive-admin-password'
			})
		).resolves.toBe('interactive-admin-password');
	});

	it('fails closed when a new administrator has no interactive or piped password source', async () => {
		await expect(
			readNewAdminPassword(false, {
				stdinIsTTY: false,
				outputIsTTY: false
			})
		).rejects.toThrow(
			'New administrators require an interactive terminal or --password-stdin with piped input'
		);
	});

	it('rejects passwords shorter than 12 characters', () => {
		expect(() => validateAdminPassword('too-short')).toThrow(
			'Administrator password must be at least 12 characters'
		);
	});

	it('rejects Better Auth 1.7.0-1.7.2 without suggesting the reverted issuer schema', () => {
		for (const version of ['1.7.0', '1.7.1', '1.7.2']) {
			expect(() => assertCompatibleBetterAuthProvisioningVersion(version)).toThrow(
				'bun install --frozen-lockfile'
			);
		}

		expect(() => assertCompatibleBetterAuthProvisioningVersion('1.7.3')).not.toThrow();
		expect(() => assertCompatibleBetterAuthProvisioningVersion('1.7.5')).not.toThrow();
	});

	it('turns the issuer adapter error into an actionable dependency mismatch', () => {
		const error = normalizeProvisioningAuthError(
			new Error(
				'The field "issuer" does not exist in the "account" Drizzle schema. Please update your drizzle schema or re-generate using "npx auth@latest generate".'
			),
			'1.7.2'
		);

		expect(error.message).toContain('bun install --frozen-lockfile');
		expect(error.message).toContain('do not add account.issuer');
		expect(error.message).not.toContain('auth@latest generate');
	});
});
