import { describe, expect, it, vi } from 'vitest';
import {
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
});
