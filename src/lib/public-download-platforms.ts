/**
 * Public installer availability is separate from installer support.
 * macOS remains implemented but is not published until a Mac can be used to
 * validate installers end-to-end. Set macos to true only after that QA gate.
 */
export type DownloadPlatform = 'windows' | 'linux' | 'macos';

export const PUBLIC_DOWNLOAD_ENABLED: Readonly<Record<DownloadPlatform, boolean>> = {
	windows: true,
	linux: true,
	macos: false
};

export function isPublicDownloadEnabled(platform: DownloadPlatform): boolean {
	return PUBLIC_DOWNLOAD_ENABLED[platform];
}
