import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
    const arch = url.searchParams.get('arch');

    if (!arch) {
        throw error(400, 'Please specify a system architecture (?arch=linux_x64 or ?arch=windows_x64)');
    }

    if (arch === 'linux_x64') {
        throw redirect(302, 'https://aceblocker.b-cdn.net/ace-engine-linux_x64');
    }

    if (arch === 'windows_x64') {
        throw error(501, 'Windows download is not yet implemented');
    }

    throw error(400, `Unsupported architecture: ${arch}. Supported architectures are: linux_x64, windows_x64`);
};
