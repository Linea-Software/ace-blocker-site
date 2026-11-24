import { isPublicDownloadEnabled } from '$lib/public-download-platforms';

export type InstallerPlatform = 'windows' | 'macos' | 'linux';

export function installerArch(platform: InstallerPlatform, architecture: string): string {
	if (platform === 'macos') return 'macos_universal';
	return `${platform}_${architecture === 'arm64' ? 'arm64' : 'x64'}`;
}

/**
 * These commands use the public download redirect, never a stale CDN URL.
 * Windows runs the branded Burn EXE or launches the legacy MSI; macOS opens the installer contained in
 * the mounted disk image; Linux extracts the published bundle and runs install.sh.
 */
export function installerCommand(
	platform: InstallerPlatform,
	architecture: string,
	fileName?: string
): string {
	const url = `https://aceblocker.com/download/${installerArch(platform, architecture)}`;
	if (platform === 'windows') {
		if (fileName?.endsWith('.exe')) {
			return `$ErrorActionPreference='Stop'; $file=Join-Path $env:TEMP 'AceBlocker-Setup.exe'; Invoke-WebRequest -Uri '${url}' -OutFile $file; Start-Process -FilePath $file -Wait`;
		}
		return `$ErrorActionPreference='Stop'; $file=Join-Path $env:TEMP 'AceBlocker-Setup.msi'; Invoke-WebRequest -Uri '${url}' -OutFile $file; Start-Process msiexec.exe -ArgumentList @('/i', ('"' + $file + '"')) -Wait`;
	}
	if (platform === 'macos') {
		return `d="$(mktemp -d)" && curl -fL '${url}' -o "$d/AceBlocker.dmg" && mkdir "$d/mount" && hdiutil attach -quiet -nobrowse -mountpoint "$d/mount" "$d/AceBlocker.dmg" && { p="$(find "$d/mount" -maxdepth 1 -name '*.pkg' -print -quit)"; a="$(find "$d/mount" -maxdepth 1 -name '*.app' -print -quit)"; if [ -n "$p" ]; then open "$p"; elif [ -n "$a" ]; then open "$a"; else echo 'No installer found in disk image' >&2; false; fi; }`;
	}
	return `d="$(mktemp -d)" && curl -fL '${url}' -o "$d/AceBlocker.tar.gz" && tar -xzf "$d/AceBlocker.tar.gz" -C "$d" && (cd "$d"/AceBlocker-*-linux-x64 && bash ./install.sh)`;
}

/** Resolve an explicit download target without enabling unpublished platforms. */
export function requestedDownloadPlatform(search: string): InstallerPlatform | null {
	const arch = new URLSearchParams(search).get('arch');
	if (arch === 'windows_x64' || arch === 'windows_arm64') return 'windows';
	if (arch === 'linux_x64' || arch === 'linux_arm64') return 'linux';
	if (arch === 'macos_universal' && isPublicDownloadEnabled('macos')) return 'macos';
	return null;
}
