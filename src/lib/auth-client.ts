import { createAuthClient } from 'better-auth/svelte';
import { dodopaymentsClient } from '@dodopayments/better-auth';

export const authClient = createAuthClient({
	baseURL: 'http://localhost:3000',
	plugins: [dodopaymentsClient()]
});
