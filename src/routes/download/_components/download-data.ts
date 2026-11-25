import { GET } from '@solidjs/web/server-functions';

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

/** Declare GET at the server-function module so RPC dispatch permits it before the page loads. */
export const getDownloadPlatforms = GET(async (): Promise<DownloadPlatforms> => {
	'use server';
	const { loadDownloadPlatforms } = await import('$lib/server/download-page-data');
	return loadDownloadPlatforms();
});
