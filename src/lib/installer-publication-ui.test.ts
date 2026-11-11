import { describe, expect, it } from 'vitest';
import { installerActionBlock, type InstallerRecord } from './installer-publication-ui';

const windows: InstallerRecord = {
	os: 'windows',
	architecture: 'x64',
	version: '1.2.3',
	updateState: 'legacy',
	artifactValidatedAt: new Date(),
	canBeDownloaded: false
};
const linux: InstallerRecord = { ...windows, os: 'linux' };

describe('installer admin publication actions', () => {
	it('permits validated manual installers in local development only', () => {
		expect(installerActionBlock(windows, [windows], true)).toBeNull();
		expect(installerActionBlock(linux, [linux], true)).toBeNull();
		expect(installerActionBlock(windows, [windows], false)).toBe('manual_windows');
		expect(installerActionBlock(linux, [linux], false)).toBe('manual_linux');
	});

	it('blocks unverified and withdrawn artifacts in either mode', () => {
		expect(
			installerActionBlock({ ...windows, artifactValidatedAt: null }, [windows], true)
		).toBe('unverified');
		expect(
			installerActionBlock({ ...windows, updateState: 'withdrawn' }, [windows], true)
		).toBe('withdrawn');
	});

	it('only permits staged signed Windows publication with exactly one validated Linux companion', () => {
		const signed = { ...windows, updateState: 'staged' };
		expect(installerActionBlock(signed, [signed], false)).toBe('missing_linux');
		expect(installerActionBlock(signed, [signed, linux], false)).toBeNull();
		expect(installerActionBlock(signed, [signed, linux, linux], false)).toBe('missing_linux');
	});

	it('locks Linux actions when a matching signed Windows release is published', () => {
		const signed = { ...windows, updateState: 'published', canBeDownloaded: true };
		expect(installerActionBlock(linux, [linux, signed], true)).toBe('linked_linux');
		expect(
			installerActionBlock({ ...linux, canBeDownloaded: true }, [linux, signed], false)
		).toBe('linked_linux');
		expect(installerActionBlock(signed, [signed], false)).toBeNull();
	});
});
