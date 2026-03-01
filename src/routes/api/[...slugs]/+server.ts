import { app } from '$lib/server/api/app';

export const fallback = ({ request }) => app.handle(request);
