export function getDownloadUrl() {
    if (typeof window === 'undefined') return '/download';

    const ua = window.navigator.userAgent.toLowerCase();
    let arch = 'windows_x64'; // Default

    if (ua.includes('linux')) {
        arch = 'linux_x64';
    } else if (ua.includes('win')) {
        arch = 'windows_x64';
    }

    return `/download?arch=${arch}`;
}
