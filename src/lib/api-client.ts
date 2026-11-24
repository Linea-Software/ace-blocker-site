import { treaty } from '@elysiajs/eden';
import type { AppType } from './server/api/app';

// The API shares the browser origin. Never hardcode localhost HTTP (mixed
// content on local HTTPS) or aceblocker.com (breaks preview/staging domains).
const origin = typeof window === 'undefined' ? 'http://127.0.0.1:5173' : window.location.origin;
const client = treaty<AppType>(origin);
export const apiClient = client.api;
