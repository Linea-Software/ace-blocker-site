import { treaty } from '@elysiajs/eden';
import type { AppType } from './server/api/app';
import { browser } from '$app/environment';

const getBaseUrl = () => {
	if (browser) return window.location.origin;
	return 'http://localhost:5173';
};

const client = treaty<AppType>(getBaseUrl());
export const api = client.api;
