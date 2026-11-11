import { describe, expect, it } from 'vitest';
import { installerArch, installerCommand } from './installer-command';

describe('terminal installer commands', () => {
	it('uses published architecture route for each platform', () => {
		expect(installerArch('windows', 'arm64')).toBe('windows_arm64');
		expect(installerArch('linux', 'x64')).toBe('linux_x64');
		expect(installerArch('macos', 'arm64')).toBe('macos_universal');
	});

	it('downloads and runs the Windows installer through the public redirect', () => {
		const command = installerCommand('windows', 'x64');
		expect(command).toContain('https://aceblocker.com/download/windows_x64');
		expect(command).toContain('Invoke-WebRequest');
		expect(command).toContain('Start-Process msiexec.exe');
		expect(command).toContain('AceBlocker-Setup.msi');
	});

	it('downloads and opens a macOS installer from the disk image', () => {
		const command = installerCommand('macos', 'arm64');
		expect(command).toContain('/download/macos_universal');
		expect(command).toContain('hdiutil attach');
		expect(command).toContain('open "$p"');
		expect(command).toContain('open "$a"');
	});

	it('extracts the published Linux bundle and invokes its installer', () => {
		const command = installerCommand('linux', 'arm64');
		expect(command).toContain('/download/linux_arm64');
		expect(command).toContain('curl -fL');
		expect(command).toContain('tar -xzf');
		expect(command).toContain('bash ./install.sh');
	});
});
