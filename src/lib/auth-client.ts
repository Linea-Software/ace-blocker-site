import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { dev } from '$app/environment';

export const authClient = createAuthClient({
	baseURL: dev ? 'https://localhost:5173' : 'https://aceblocker.com',
	plugins: [dodopaymentsClient()]
});
