import { dev } from '$app/environment';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    if (!dev) {
        // Production behavior not specified, returning 404 for now
        throw error(404, 'Download not available in production yet');
    }

    return new Response('', {
        headers: {
            'Content-Type': 'text/plain',
            'Content-Disposition': 'attachment; filename="aceblocker.txt"'
        }
    });
};
