import { treaty } from '@elysiajs/eden';
import type { AppType } from './server/api/app';
import { dev } from '$app/environment';

const getBaseUrl = () => {
	if (dev) {
		return 'https://localhost:5173';
	}
	return 'https://aceblocker.com';
};

const client = treaty<AppType>(getBaseUrl());
export const apiClient = client.api;
