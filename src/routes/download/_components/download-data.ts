export type DownloadOS = 'windows' | 'linux' | 'macos';
export type DownloadPlatformMeta = {
	version: string;
	size: number;
	fileName: string;
	os: DownloadOS;
	architecture: string;
	hash: string;
};
export type DownloadPlatforms = Record<DownloadOS, DownloadPlatformMeta | null>;

/** Server-only read; expose public metadata only. */
export async function getDownloadPlatforms(): Promise<DownloadPlatforms> {
	'use server';
	const { loadDownloadPlatforms } = await import('$lib/server/download-page-data');
	return loadDownloadPlatforms();
}
