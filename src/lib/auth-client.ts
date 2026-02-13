import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';
import { env } from '$env/dynamic/private';

export const authClient = createAuthClient({
	baseURL: env.BETTER_AUTH_URL || 'https://localhost:5173',
	plugins: [dodopaymentsClient()]
});
