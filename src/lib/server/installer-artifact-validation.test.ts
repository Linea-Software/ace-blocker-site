import { describe, expect, it } from 'vitest';
import { gzipSync } from 'node:zlib';
import { validateInstallerArtifact } from './installer-artifact-validation';

function validMsi() {
	const header = Buffer.alloc(512);
	Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(header);
	header.writeUInt16LE(0xfffe, 28);
	header.writeUInt16LE(9, 30);
	return new File([header], 'AceBlocker-1.2.3.msi');
}

function validBurnExe(options: { machine?: number; magic?: number; section?: string } = {}) {
	const bytes = Buffer.alloc(8192);
	bytes.write('MZ', 0);
	bytes.writeUInt32LE(0x120, 60);
	bytes.write('PE', 0x120);
	bytes.writeUInt16LE(options.machine ?? 0x8664, 0x124);
	bytes.writeUInt16LE(1, 0x126);
	bytes.writeUInt16LE(240, 0x134);
	bytes.writeUInt16LE(0x20b, 0x138);
	const section = 0x120 + 24 + 240;
	bytes.write(options.section ?? '.wixburn', section);
	bytes.writeUInt32LE(512, section + 16);
	bytes.writeUInt32LE(4096, section + 20);
	bytes.writeUInt32LE(options.magic ?? 0x00f14300, 4096);
	return new File([bytes], 'AceBlocker-Setup-1.2.3.exe');
}

function tarEntry(name: string, data: Buffer, kind: 'file' | 'link' = 'file'): Buffer {
	const header = Buffer.alloc(512);
	header.write(name, 0, 'utf8');
	header.write('0000644\0', 100, 'ascii');
	header.write('0000000\0', 108, 'ascii');
	header.write('0000000\0', 116, 'ascii');
	header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 'ascii');
	header.write('00000000000\0', 136, 'ascii');
	header.fill(32, 148, 156);
	header[156] = kind === 'file' ? 48 : 50;
	header.write('ustar\0', 257, 'ascii');
	header.write('00', 263, 'ascii');
	const sum = header.reduce((a, b) => a + b, 0);
	header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii');
	return Buffer.concat([
		header,
		data,
		Buffer.alloc(Math.ceil(data.length / 512) * 512 - data.length)
	]);
}

const required = [
	'ace-engine',
	'ace-watchdog',
	'ace-redirect',
	'install-cert',
	'ace-app',
	'install.sh',
	'browser-proxy-policy.py',
	'migrate-legacy-data.sh',
	'ace-blocker.desktop',
	'ace-blocker-handler.desktop',
	'ace-blocker.png',
	'RELEASING.md',
	'bundled-packs/manifest.json'
];
function validElf() {
	const bytes = Buffer.alloc(24);
	Buffer.from([127, 69, 76, 70, 2, 1, 1, 0]).copy(bytes);
	bytes.writeUInt16LE(62, 18);
	return bytes;
}
function linuxFile(
	extra: Array<{ name: string; data: Buffer; kind?: 'file' | 'link' }> = [],
	omit?: string
): File {
	const root = 'AceBlocker-1.2.3-linux-x64';
	const binaries = new Set([
		'ace-engine',
		'ace-watchdog',
		'ace-redirect',
		'install-cert',
		'ace-app'
	]);
	const entries = required
		.filter((name) => name !== omit)
		.map((name) =>
			tarEntry(root + '/' + name, binaries.has(name) ? validElf() : Buffer.from('content'))
		);
	for (const item of extra) entries.push(tarEntry(item.name, item.data, item.kind));
	const tar = Buffer.concat([...entries, Buffer.alloc(1024)]);
	return new File([gzipSync(tar)], root + '.tar.gz');
}
describe('desktop installer binary validation', () => {
	it('checks Windows MSI structure, target and exact filename', async () => {
		expect(await validateInstallerArtifact(validMsi(), '1.2.3', 'windows', 'x64')).toBeNull();
		expect(
			await validateInstallerArtifact(
				new File(['MZ'], 'AceBlocker-1.2.3.msi'),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/MSI/);
		expect(
			await validateInstallerArtifact(
				new File(['abc'], 'AceBlocker-1.2.3.zip'),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/Expected/);
		expect(await validateInstallerArtifact(validMsi(), '1.2.3', 'windows', 'arm64')).toMatch(
			/Only/
		);
		expect(await validateInstallerArtifact(validMsi(), '1.2.3', 'macos', 'x64')).toMatch(
			/Only/
		);
	});
	it('accepts only x64 WiX Burn setup EXEs, not arbitrary PE files or ZIP wrappers', async () => {
		expect(
			await validateInstallerArtifact(validBurnExe(), '1.2.3', 'windows', 'x64')
		).toBeNull();
		expect(
			await validateInstallerArtifact(
				validBurnExe({ machine: 0x14c }),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/WiX Burn/);
		expect(
			await validateInstallerArtifact(
				validBurnExe({ section: '.rsrc' }),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/WiX Burn/);
		expect(
			await validateInstallerArtifact(validBurnExe({ magic: 0 }), '1.2.3', 'windows', 'x64')
		).toMatch(/WiX Burn/);
		expect(
			await validateInstallerArtifact(
				new File(['MZ'], 'AceBlocker-Setup-1.2.3.exe'),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/WiX Burn/);
		expect(
			await validateInstallerArtifact(
				new File(['PK'], 'artifact.zip'),
				'1.2.3',
				'windows',
				'x64'
			)
		).toMatch(/Expected/);
		expect(await validateInstallerArtifact(validBurnExe(), '1.2.4', 'windows', 'x64')).toMatch(
			/Expected/
		);
	});

	it('accepts Linux tar.gz with required files and x64 ELF executables', async () => {
		expect(await validateInstallerArtifact(linuxFile(), '1.2.3', 'linux', 'x64')).toBeNull();
	});
	it('rejects missing files and traversal, links and wrong root', async () => {
		expect(
			await validateInstallerArtifact(linuxFile([], 'install.sh'), '1.2.3', 'linux', 'x64')
		).toMatch(/missing install.sh/);
		expect(
			await validateInstallerArtifact(
				linuxFile([
					{ name: 'AceBlocker-1.2.3-linux-x64/../outside', data: Buffer.from('x') }
				]),
				'1.2.3',
				'linux',
				'x64'
			)
		).toMatch(/Unsafe/);
		expect(
			await validateInstallerArtifact(
				linuxFile([
					{
						name: 'AceBlocker-1.2.3-linux-x64/hijack',
						data: Buffer.from('x'),
						kind: 'link'
					}
				]),
				'1.2.3',
				'linux',
				'x64'
			)
		).toMatch(/links/);
		expect(
			await validateInstallerArtifact(
				linuxFile([{ name: 'different-root/x', data: Buffer.from('x') }]),
				'1.2.3',
				'linux',
				'x64'
			)
		).toMatch(/Unsafe/);
	});
	it('rejects damaged archives and GitHub artifact ZIP wrappers', async () => {
		expect(
			await validateInstallerArtifact(
				new File([new Uint8Array([80, 75, 3, 4])], 'actions.zip'),
				'1.2.3',
				'linux',
				'x64'
			)
		).toMatch(/Expected/);
		expect(
			await validateInstallerArtifact(
				new File(['broken'], 'AceBlocker-1.2.3-linux-x64.tar.gz'),
				'1.2.3',
				'linux',
				'x64'
			)
		).not.toBeNull();
	});
});
