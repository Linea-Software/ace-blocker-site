import { error, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { dev } from '$app/environment';

const baseUrl = new URL('https://cdn.aceblocker.com');

export const GET: RequestHandler = async ({ params }) => {
    const { arch } = params;

    if (dev) {
        return new Response(null, { status: 200 });
    }

    if (arch === 'linux_x64') {
        throw redirect(302, new URL('/ace-engine-linux_x64', baseUrl));
    }

    if (arch === 'windows_x64') {
        throw redirect(302, new URL('/ace-engine-win_x64.exe', baseUrl));
    }

    throw error(400, `Unsupported architecture: ${arch}. Supported architectures are: linux_x64, windows_x64`);
};
