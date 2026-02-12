import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';

export const authClient = createAuthClient({
	baseURL: 'https://localhost:5173',
	plugins: [dodopaymentsClient()]
});
