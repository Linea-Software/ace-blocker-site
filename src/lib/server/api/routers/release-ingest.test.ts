import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
	findInstaller,
	uploadInstaller,
	getArrayBufferChecksum,
	getLatestInstaller,
	getLatestResistanceScript,
	getLatestSitePacks
} = vi.hoisted(() => ({
	findInstaller: vi.fn(),
	uploadInstaller: vi.fn(),
	getArrayBufferChecksum: vi.fn(),
	getLatestInstaller: vi.fn(),
	getLatestResistanceScript: vi.fn(),
	getLatestSitePacks: vi.fn(() => new Map())
}));

vi.mock('$lib/server/db', () => ({
	db: {
		query: {
			aceBlockerInstaller: {
				findFirst: findInstaller
			}
		}
	}
}));

vi.mock('$lib/server/cache', () => ({
	getLatestInstaller,
	getLatestResistanceScript,
	getLatestSitePacks
}));

vi.mock('$lib/server/cdn', () => ({
	CDNErrorType: {
		InvalidArtifact: 'InvalidArtifact',
		UploadFailed: 'UploadFailed'
	},
	getArrayBufferChecksum,
	uploadInstaller
}));

vi.mock('$lib/server/logger', () => ({
	createLogger: () => ({
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn()
	})
}));

import { releasesRouter } from './releases';

const TOKEN = '[REDACTED_SECRET]';
const SHA256 = 'a'.repeat(64);
const COMMIT = '1'.repeat(40);
const ENGINE_COMMIT = '2'.repeat(40);
const APP_COMMIT = '3'.repeat(40);

function candidateBody(overrides: Record<string, string> = {}): FormData {
	const fields = {
		version: '0.3.0',
		os: 'windows',
		architecture: 'x64',
		sha256: SHA256,
		sourceRepository: 'Linea-Software/ace-installer',
		sourceCommit: COMMIT,
		sourceRunId: '12345',
		sourceRunUrl: 'https://github.com/Linea-Software/ace-installer/actions/runs/12345',
		engineCommit: ENGINE_COMMIT,
		appCommit: APP_COMMIT,
		...overrides
	};

	const form = new FormData();
	form.append('file', new File([new Uint8Array([1, 2, 3, 4])], 'AceBlocker-0.3.0.msi'));
	for (const [key, value] of Object.entries(fields)) {
		form.append(key, value);
	}
	return form;
}

function ingest(init: RequestInit) {
	return releasesRouter.handle(
		new Request('http://localhost/releases/ingest/installer', {
			method: 'POST',
			...init
		})
	);
}

describe('installer release ingest', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.ACE_RELEASE_INGEST_TOKEN = TOKEN;
		findInstaller.mockResolvedValue(null);
		getArrayBufferChecksum.mockReturnValue(SHA256);
		uploadInstaller.mockResolvedValue({
			isErr: () => false,
			_unsafeUnwrap: () => ({
				downloadUrl: 'https://cdn.example/installer.msi',
				hash: SHA256
			})
		});
	});

	it('is disabled when the server token is not configured', async () => {
		delete process.env.ACE_RELEASE_INGEST_TOKEN;
		const response = await ingest({
			body: candidateBody(),
			headers: { authorization: `Bearer ${TOKEN}` }
		});
		expect(response.status).toBe(503);
		expect(uploadInstaller).not.toHaveBeenCalled();
	});

	it('rejects an invalid bearer token', async () => {
		const response = await ingest({
			body: candidateBody(),
			headers: { authorization: 'Bearer wrong-token' }
		});
		expect(response.status).toBe(401);
		expect(uploadInstaller).not.toHaveBeenCalled();
	});

	it('rejects a checksum mismatch before upload', async () => {
		getArrayBufferChecksum.mockReturnValue('b'.repeat(64));
		const response = await ingest({
			body: candidateBody(),
			headers: { authorization: `Bearer ${TOKEN}` }
		});
		expect(response.status).toBe(400);
		expect(uploadInstaller).not.toHaveBeenCalled();
	});

	it('rejects reusing an existing version/target', async () => {
		findInstaller.mockResolvedValue({ id: 'existing' });
		const response = await ingest({
			body: candidateBody(),
			headers: { authorization: `Bearer ${TOKEN}` }
		});
		expect(response.status).toBe(409);
		expect(uploadInstaller).not.toHaveBeenCalled();
	});

	it('stores a valid CI candidate as staged with provenance', async () => {
		const response = await ingest({
			body: candidateBody(),
			headers: { authorization: `Bearer ${TOKEN}` }
		});
		expect(response.status).toBe(200);
		expect(uploadInstaller).toHaveBeenCalledWith(
			expect.any(File),
			'0.3.0',
			'windows',
			'x64',
			false,
			{
				sourceRepository: 'Linea-Software/ace-installer',
				sourceCommit: COMMIT,
				sourceRunId: '12345',
				sourceRunUrl: 'https://github.com/Linea-Software/ace-installer/actions/runs/12345',
				engineCommit: ENGINE_COMMIT,
				appCommit: APP_COMMIT
			}
		);
	});
});
