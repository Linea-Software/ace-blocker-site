import { expectedInstallerFile, supportedInstallerTarget } from '$lib/installer-release-policy';

/** Structural validation only: Windows Authenticode and release signatures are separate gates. */
const MSI_MAGIC = Buffer.from('d0cf11e0a1b11ae1', 'hex');

export function hasValidMsiHeader(header: Buffer): boolean {
	return (
		header.length >= 512 &&
		header.subarray(0, 8).equals(MSI_MAGIC) &&
		header.readUInt16LE(28) === 0xfffe &&
		[9, 12].includes(header.readUInt16LE(30))
	);
}
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 512 * 1024 * 1024;
const REQUIRED_LINUX_FILES = [
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
] as const;
const ELF_BINARIES = new Set([
	'ace-engine',
	'ace-watchdog',
	'ace-redirect',
	'install-cert',
	'ace-app'
]);

function nulString(bytes: Buffer): string {
	return bytes.toString('utf8').split('\0')[0];
}

function tarOctal(bytes: Buffer): number {
	const value = nulString(bytes).trim();
	if (!/^[0-7]+$/.test(value)) throw new Error('Invalid tar number');
	const parsed = Number.parseInt(value, 8);
	if (!Number.isSafeInteger(parsed)) throw new Error('Unsafe tar size');
	return parsed;
}

function tarHeader(header: Buffer, root: string) {
	let checksum = 0;
	for (let i = 0; i < 512; i++) checksum += i >= 148 && i < 156 ? 32 : header[i];
	if (checksum !== tarOctal(header.subarray(148, 156))) throw new Error('Invalid tar checksum');
	const prefix = nulString(header.subarray(345, 500));
	const name = nulString(header.subarray(0, 100));
	const path = prefix ? `${prefix}/${name}` : name;
	const components = path.replace(/\/$/, '').split('/');
	if (
		path.includes('\\') ||
		components.some((part) => !part || part === '.' || part === '..') ||
		components[0] !== root
	)
		throw new Error('Unsafe archive path');
	const entryType = header[156];
	if (![0, 48, 53].includes(entryType))
		throw new Error('Archive links and special entries are not allowed');
	const size = tarOctal(header.subarray(124, 136));
	if (entryType === 53 && size !== 0) throw new Error('Invalid directory entry');
	return { name: components.slice(1).join('/'), size, isFile: entryType !== 53 };
}

function validElfX64(prefix: Buffer): boolean {
	return (
		prefix.length === 20 &&
		prefix.subarray(0, 4).equals(Buffer.from([0x7f, 0x45, 0x4c, 0x46])) &&
		prefix[4] === 2 &&
		prefix[5] === 1 &&
		prefix.readUInt16LE(18) === 62
	);
}

/** Bounded streaming tar parser: never extracts, follows links, or executes archive contents. */
async function inspectLinuxBundle(file: File, version: string): Promise<void> {
	const root = `AceBlocker-${version}-linux-x64`;
	const seen = new Set<string>();
	let pending = Buffer.alloc(0);
	let remainingPadded = 0;
	let remainingData = 0;
	let probeElf = false;
	let elfPrefix = Buffer.alloc(0);
	let zeroBlocks = 0;
	let atEnd = false;
	let expandedBytes = 0;
	let entries = 0;
	const reader = file.stream().pipeThrough(new DecompressionStream('gzip'));
	for await (const chunk of reader) {
		expandedBytes += chunk.byteLength;
		if (expandedBytes > MAX_EXPANDED_BYTES) throw new Error('Archive expands beyond 512 MiB');
		pending = Buffer.concat([pending, Buffer.from(chunk)]);
		while (pending.length) {
			if (remainingPadded) {
				const take = Math.min(remainingPadded, pending.length);
				if (probeElf && elfPrefix.length < 20 && remainingData) {
					elfPrefix = Buffer.concat([
						elfPrefix,
						pending.subarray(0, Math.min(take, remainingData, 20 - elfPrefix.length))
					]);
				}
				remainingData = Math.max(0, remainingData - take);
				remainingPadded -= take;
				pending = pending.subarray(take);
				if (!remainingPadded && probeElf) {
					if (!validElfX64(elfPrefix))
						throw new Error('Expected x64 Linux ELF executable');
					probeElf = false;
				}
				continue;
			}
			if (pending.length < 512) break;
			const block = pending.subarray(0, 512);
			pending = pending.subarray(512);
			if (block.every((byte) => byte === 0)) {
				zeroBlocks++;
				if (zeroBlocks >= 2) atEnd = true;
				continue;
			}
			if (atEnd || zeroBlocks) throw new Error('Invalid end-of-archive markers');
			if (++entries > 4096) throw new Error('Archive contains too many entries');
			const entry = tarHeader(block, root);
			if (entry.isFile) {
				if (!entry.name || seen.has(entry.name))
					throw new Error('Duplicate or invalid file');
				seen.add(entry.name);
				if (
					REQUIRED_LINUX_FILES.includes(
						entry.name as (typeof REQUIRED_LINUX_FILES)[number]
					) &&
					!entry.size
				) {
					throw new Error('Required release file is empty');
				}
			}
			remainingData = entry.size;
			remainingPadded = Math.ceil(entry.size / 512) * 512;
			probeElf = entry.isFile && ELF_BINARIES.has(entry.name);
			elfPrefix = Buffer.alloc(0);
		}
	}
	if (remainingPadded || pending.length >= 512 || !atEnd)
		throw new Error('Truncated tar archive');
	for (const filename of REQUIRED_LINUX_FILES) {
		if (!seen.has(filename)) throw new Error(`Linux archive is missing ${filename}`);
	}
}

export async function validateInstallerArtifact(
	file: File,
	version: string,
	os: string,
	architecture: string
): Promise<string | null> {
	if (!supportedInstallerTarget(os, architecture))
		return 'Only Windows x64 MSI and Linux x64 tar.gz are supported';
	if (!/^\d+\.\d+\.\d+$/.test(version)) return 'Version must use major.minor.patch';
	const expected = expectedInstallerFile(os, version)!;
	if (file.name !== expected) return `Expected ${expected}, not the GitHub Actions ZIP wrapper`;
	if (!file.size || file.size > MAX_UPLOAD_BYTES)
		return 'File must be nonempty and no larger than 100 MiB';
	try {
		if (os === 'windows') {
			const header = Buffer.from(await file.slice(0, 512).arrayBuffer());
			if (!hasValidMsiHeader(header)) {
				return 'Not an MSI compound-file header';
			}
		} else {
			await inspectLinuxBundle(file, version);
		}
	} catch (error) {
		return error instanceof Error ? error.message : 'Unreadable installer artifact';
	}
	return null;
}
