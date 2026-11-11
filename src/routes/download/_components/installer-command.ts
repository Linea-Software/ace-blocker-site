export type InstallerPlatform = 'windows' | 'macos' | 'linux';

export function installerArch(platform: InstallerPlatform, architecture: string): string {
	if (platform === 'macos') return 'macos_universal';
	return `${platform}_${architecture === 'arm64' ? 'arm64' : 'x64'}`;
}

/**
 * These commands use the public download redirect, never a stale CDN URL.
 * Windows launches the MSI installer; macOS opens the installer contained in
 * the mounted disk image; Linux extracts the published bundle and runs install.sh.
 */
export function installerCommand(platform: InstallerPlatform, architecture: string): string {
	const url = `https://aceblocker.com/download/${installerArch(platform, architecture)}`;
	if (platform === 'windows') {
		return `$ErrorActionPreference='Stop'; $file=Join-Path $env:TEMP 'AceBlocker-Setup.msi'; Invoke-WebRequest -Uri '${url}' -OutFile $file; Start-Process msiexec.exe -ArgumentList @('/i', ('"' + $file + '"')) -Wait`;
	}
	if (platform === 'macos') {
		return `d="$(mktemp -d)" && curl -fL '${url}' -o "$d/AceBlocker.dmg" && mkdir "$d/mount" && hdiutil attach -quiet -nobrowse -mountpoint "$d/mount" "$d/AceBlocker.dmg" && { p="$(find "$d/mount" -maxdepth 1 -name '*.pkg' -print -quit)"; a="$(find "$d/mount" -maxdepth 1 -name '*.app' -print -quit)"; if [ -n "$p" ]; then open "$p"; elif [ -n "$a" ]; then open "$a"; else echo 'No installer found in disk image' >&2; false; fi; }`;
	}
	return `d="$(mktemp -d)" && curl -fL '${url}' -o "$d/AceBlocker.tar.gz" && tar -xzf "$d/AceBlocker.tar.gz" -C "$d" && (cd "$d"/AceBlocker-*-linux-x64 && bash ./install.sh)`;
}
