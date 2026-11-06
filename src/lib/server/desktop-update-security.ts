/**
 * Ace Blocker Windows MSI v1 signed feed. Exact byte-for-byte counterpart of
 * ace-blocker/crates/ace-update-security and installer/release_manifest.py.
 *
 * NO private keys here. The signer is an offline, approved release pipeline.
 */
import { createHash, createPublicKey, verify } from 'node:crypto';

export const SIGNED_CONTEXT = Buffer.from('ace-blocker-windows-msi-release-v1\0', 'ascii');
export const MAX_SIGNED_PAYLOAD = 16 * 1024;
export const MAX_DESKTOP_MSI = 2_147_483_647;

export type SignedEnvelope = { payload: string; signature: string; key_id: string };
export type DesktopReleasePayload = {
	schemaVersion: 1;
	version: string;
	channel: 'stable';
	os: 'windows';
	architecture: 'x64';
	packageUrl: string;
	sha256: string;
	publisherCertificateSha256: string;
	minimumInstalledVersion: string | null;
};

const payloadKeys = [
	'architecture',
	'channel',
	'minimumInstalledVersion',
	'os',
	'packageUrl',
	'publisherCertificateSha256',
	'schemaVersion',
	'sha256',
	'version'
];

export class DesktopReleaseError extends Error {
	constructor(
		public readonly code: 'disabled' | 'invalid' | 'unavailable' | 'conflict',
		message: string
	) {
		super(message);
	}
}

export function updatesEnabled(): boolean {
	return process.env.ACE_DESKTOP_UPDATES_ENABLED === 'true';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseStableVersion(text: string): bigint[] | null {
	if (text.length > 64 || !/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(text))
		return null;
	const numbers = text.split('.').map((value) => BigInt(value));
	return numbers.every((part) => part <= 18446744073709551615n) ? numbers : null;
}

export function compareStableVersions(a: string, b: string): number {
	const aa = parseStableVersion(a),
		bb = parseStableVersion(b);
	if (!aa || !bb) throw new DesktopReleaseError('invalid', 'Invalid stable semantic version');
	for (let i = 0; i < 3; i++) {
		if (aa[i] !== bb[i]) return aa[i] > bb[i] ? 1 : -1;
	}
	return 0;
}

function decodeBase64(value: unknown, maxBytes: number): Buffer {
	if (
		typeof value !== 'string' ||
		!value.length ||
		value.length > Math.ceil(maxBytes / 3) * 4 + 4 ||
		!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
	)
		throw new DesktopReleaseError('invalid', 'Invalid base64');
	const decoded = Buffer.from(value, 'base64');
	if (decoded.length > maxBytes || decoded.toString('base64') !== value)
		throw new DesktopReleaseError('invalid', 'Non-canonical base64');
	return decoded;
}

function trustedKey(keyId: string): Buffer {
	if (!/^[A-Za-z0-9_-]{1,80}$/.test(keyId))
		throw new DesktopReleaseError('invalid', 'Invalid key ID');
	let keys: unknown;
	try {
		keys = JSON.parse(process.env.ACE_DESKTOP_UPDATE_PUBLIC_KEYS ?? '');
	} catch {
		throw new DesktopReleaseError('disabled', 'Manifest trust roots are not configured');
	}
	if (!isPlainObject(keys))
		throw new DesktopReleaseError('disabled', 'Invalid trust-root configuration');
	const hex = keys[keyId];
	if (typeof hex !== 'string' || !/^[a-fA-F0-9]{64}$/.test(hex))
		throw new DesktopReleaseError('disabled', 'Untrusted release signing key');
	return Buffer.from(hex, 'hex');
}

export function expectedDesktopUrl(version: string, sha256: string, cdnBaseUrl: URL): string {
	if (!parseStableVersion(version) || !/^[a-f0-9]{64}$/.test(sha256))
		throw new DesktopReleaseError('invalid', 'Unsafe release path');
	if (
		cdnBaseUrl.protocol !== 'https:' ||
		!cdnBaseUrl.hostname ||
		cdnBaseUrl.username ||
		cdnBaseUrl.password ||
		cdnBaseUrl.search ||
		cdnBaseUrl.hash
	)
		throw new DesktopReleaseError('disabled', 'Invalid public CDN origin');
	return new URL(`signed/windows/x64/${version}/${sha256}.msi`, cdnBaseUrl).toString();
}

export function verifyDesktopEnvelope(envelope: unknown, cdnBaseUrl: URL): DesktopReleasePayload {
	if (!updatesEnabled())
		throw new DesktopReleaseError('disabled', 'Desktop updates are disabled');
	// The Rust client bounds the entire HTTP envelope to 16 KiB, not just the decoded payload.
	if (JSON.stringify(envelope).length > MAX_SIGNED_PAYLOAD)
		throw new DesktopReleaseError('invalid', 'Release envelope exceeds client limit');
	if (
		!isPlainObject(envelope) ||
		Object.keys(envelope).sort().join(',') !== 'key_id,payload,signature'
	)
		throw new DesktopReleaseError('invalid', 'Invalid release envelope');
	const keyId = envelope.key_id;
	if (typeof keyId !== 'string') throw new DesktopReleaseError('invalid', 'Missing signing key');
	const publicKey = trustedKey(keyId);
	const payload = decodeBase64(envelope.payload, MAX_SIGNED_PAYLOAD);
	const signature = decodeBase64(envelope.signature, 64);
	if (signature.length !== 64)
		throw new DesktopReleaseError('invalid', 'Invalid signature length');
	const spki = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), publicKey]);
	let valid = false;
	try {
		valid = verify(
			null,
			Buffer.concat([SIGNED_CONTEXT, payload]),
			createPublicKey({ key: spki, format: 'der', type: 'spki' }),
			signature
		);
	} catch {
		// Invalid public key or signature cannot be interpreted as a valid release.
	}
	if (!valid) throw new DesktopReleaseError('invalid', 'Invalid Ed25519 manifest signature');

	let value: unknown;
	try {
		value = JSON.parse(payload.toString('utf8'));
	} catch {
		throw new DesktopReleaseError('invalid', 'Invalid signed JSON');
	}
	if (!isPlainObject(value) || Object.keys(value).sort().join(',') !== payloadKeys.join(','))
		throw new DesktopReleaseError('invalid', 'Unknown or missing signed fields');
	// Exact UTF-8 bytes, sorted ASCII keys, no whitespace or duplicate keys.
	// Corresponds to json.dumps(... sort_keys=True, separators=(',', ':'), ensure_ascii=True)
	// in the pinned desktop signing utility (all v1 field values are ASCII).
	const canonical = JSON.stringify(
		Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((k) => [k, value[k]])
		)
	);
	if (payload.toString('utf8') !== canonical)
		throw new DesktopReleaseError('invalid', 'Noncanonical or ambiguous signed JSON');
	const metadata = value as unknown as DesktopReleasePayload;
	if (
		metadata.schemaVersion !== 1 ||
		metadata.channel !== 'stable' ||
		metadata.os !== 'windows' ||
		metadata.architecture !== 'x64' ||
		!parseStableVersion(metadata.version) ||
		(metadata.minimumInstalledVersion !== null &&
			(typeof metadata.minimumInstalledVersion !== 'string' ||
				!parseStableVersion(metadata.minimumInstalledVersion))) ||
		typeof metadata.sha256 !== 'string' ||
		!/^[a-f0-9]{64}$/.test(metadata.sha256) ||
		typeof metadata.publisherCertificateSha256 !== 'string' ||
		!/^[a-f0-9]{64}$/.test(metadata.publisherCertificateSha256) ||
		typeof metadata.packageUrl !== 'string' ||
		metadata.packageUrl !== expectedDesktopUrl(metadata.version, metadata.sha256, cdnBaseUrl)
	)
		throw new DesktopReleaseError('invalid', 'Signed manifest violates the release policy');
	const pinnedPublisher = process.env.ACE_DESKTOP_PUBLISHER_CERT_SHA256;
	if (!pinnedPublisher || !/^[a-fA-F0-9]{64}$/.test(pinnedPublisher))
		throw new DesktopReleaseError('disabled', 'Publisher identity is not configured');
	if (pinnedPublisher.toLowerCase() !== metadata.publisherCertificateSha256)
		throw new DesktopReleaseError('invalid', 'Publisher certificate mismatch');

	return metadata;
}

export function envelopeEtag(envelope: SignedEnvelope): string {
	return (
		'"' +
		createHash('sha256').update(envelope.payload).update(envelope.signature).digest('hex') +
		'"'
	);
}
