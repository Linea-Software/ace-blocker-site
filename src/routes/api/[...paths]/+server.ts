import { app } from '$lib/server/api/app';
import type { RequestHandler } from '@sveltejs/kit';

export const fallback: RequestHandler = ({ request }) => app.fetch(request);
